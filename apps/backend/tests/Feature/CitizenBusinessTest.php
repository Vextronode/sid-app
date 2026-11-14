<?php

namespace Tests\Feature;

use App\Enums\BusinessCategory;
use App\Enums\CimartApplicationStatus;
use App\Models\CitizenBusiness;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\User;
use App\Models\Village;
use App\Services\CitizenBusinessService;
use Database\Seeders\ApprovalFlowSeeder;
use Database\Seeders\LetterTypeSeeder;
use DateTimeInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Spatie\Activitylog\Models\Activity;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Data usaha warga dicatat saat SKU (A01) final approve, beserta aturan
 * pendaftaran dan pembatalan pedagang Cimart.
 */
class CitizenBusinessTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $rtApprover;

    private array $kades;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');

        $this->village = Village::factory()->create();
        $this->seed([ApprovalFlowSeeder::class, LetterTypeSeeder::class]);

        ['rt' => $rt] = $this->makeArea($this->village);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
    }

    public function test_final_approval_records_the_business_and_the_cimart_opt_in(): void
    {
        $letterId = $this->issueBusinessLetter([
            'nama_usaha' => '  Warung   Kopi Joni ',
            'telepon_usaha' => '+6281234567890',
        ]);

        $business = CitizenBusiness::query()->sole();
        $letter = Letter::query()->findOrFail($letterId);

        $this->assertSame($letterId, $business->letter_id);
        $this->assertSame($this->applicant['citizen']->id, $business->citizen_id);
        $this->assertSame($this->village->id, $business->village_id);
        $this->assertSame('Warung Kopi Joni', $business->business_name);
        $this->assertSame('Warung kopi', $business->business_activity);
        $this->assertSame(BusinessCategory::Kuliner, $business->category);
        $this->assertSame('warkopjoni@example.com', $business->email);
        $this->assertSame('081234567890', $business->phone);
        $this->assertSame('Jl. Raya Cibenda No. 12, RT 01/RW 02', $business->address);
        $this->assertSame(CimartApplicationStatus::Pending, $business->cimart_status);
        $this->assertNotNull($business->cimart_requested_at);
        $this->assertNull($business->cimart_decided_at);
        $this->assertTrue($letter->business->is($business));
        $this->assertTrue($this->applicant['citizen']->businesses()->sole()->is($business));
    }

    public function test_choosing_not_to_join_cimart_records_the_business_only(): void
    {
        $this->issueBusinessLetter(['daftar_cimart' => 'tidak']);

        $business = CitizenBusiness::query()->sole();
        $this->assertNull($business->cimart_status);
        $this->assertNull($business->cimart_requested_at);
    }

    public function test_business_contacts_are_encrypted_at_rest(): void
    {
        $this->issueBusinessLetter();

        $row = DB::table('citizen_businesses')->sole();

        $this->assertNotSame('warkopjoni@example.com', $row->email);
        $this->assertNotSame('081234567890', $row->phone);
        $this->assertSame('warkopjoni@example.com', Crypt::decryptString($row->email));
        $this->assertSame('081234567890', Crypt::decryptString($row->phone));
    }

    public function test_other_letters_and_unfinished_or_rejected_business_letters_record_nothing(): void
    {
        // Baru disetujui RT.
        $letterId = $this->submitBusinessLetter();
        $this->decide($this->rtApprover['user'], 'rt', $letterId, 'approved');
        $this->assertDatabaseCount('citizen_businesses', 0);

        // Ditolak Kepala Desa.
        $this->decide($this->kades['user'], 'kades', $letterId, 'rejected');
        $this->assertDatabaseCount('citizen_businesses', 0);

        // Jenis surat lain yang terbit.
        $other = $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', ['letter_type_id' => $this->letterType('A09')->id])
            ->assertCreated()
            ->json('data.id');
        $this->decide($this->rtApprover['user'], 'rt', $other, 'approved');
        $this->decide($this->kades['user'], 'kades', $other, 'approved');

        $this->assertSame('approved', Letter::query()->findOrFail($other)->status->value);
        $this->assertDatabaseCount('citizen_businesses', 0);
    }

    public function test_a_failure_while_recording_cancels_the_final_approval(): void
    {
        $this->mock(CitizenBusinessService::class)
            ->shouldReceive('recordFromLetter')
            ->andThrow(new RuntimeException('Gagal mencatat data usaha.'));

        $letterId = $this->submitBusinessLetter();
        $this->decide($this->rtApprover['user'], 'rt', $letterId, 'approved');

        $this->actingAs($this->kades['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertStatus(500);

        $letter = Letter::query()->findOrFail($letterId);
        $this->assertSame('in_progress', $letter->status->value);
        $this->assertNull($letter->letter_number);
        $this->assertNull($letter->expires_at);
        $this->assertNull($letter->snapshot);
        $this->assertDatabaseCount('citizen_businesses', 0);
    }

    public function test_each_business_letter_of_a_citizen_records_its_own_business(): void
    {
        $this->issueBusinessLetter();
        $this->issueBusinessLetter(['nama_usaha' => 'Jahit Rina', 'kategori_usaha' => 'non_kuliner']);

        $this->assertSame(2, $this->applicant['citizen']->businesses()->count());
        $this->assertSame(2, CitizenBusiness::query()->distinct()->count('letter_id'));
    }

    public function test_recording_is_idempotent_and_skips_business_letters_without_business_data(): void
    {
        $letterId = $this->issueBusinessLetter();
        $service = app(CitizenBusinessService::class);
        $letter = Letter::query()->with('letterType')->findOrFail($letterId);

        $this->assertTrue($service->recordFromLetter($letter)->is(CitizenBusiness::query()->sole()));
        $this->assertDatabaseCount('citizen_businesses', 1);

        // SKU yang diajukan sebelum form memuat data usaha.
        $legacy = Letter::factory()->create([
            'village_id' => $this->village->id,
            'letter_type_id' => $this->letterType('A01')->id,
            'payload' => ['kegiatan_usaha' => 'Bengkel'],
        ]);
        $this->assertNull($service->recordFromLetter($legacy->load('letterType')));
        $this->assertDatabaseCount('citizen_businesses', 1);
    }

    public function test_requesting_cimart_follows_the_registration_rules(): void
    {
        $service = app(CitizenBusinessService::class);

        // Belum mendaftar, ditolak, atau dibatalkan: boleh (daftar ulang),
        // dan sisa keputusan sebelumnya dikosongkan.
        foreach ([null, CimartApplicationStatus::Rejected, CimartApplicationStatus::Cancelled] as $status) {
            $business = $this->business($status);

            $result = $service->requestCimart($business)->fresh();

            $this->assertSame(CimartApplicationStatus::Pending, $result->cimart_status);
            $this->assertTrue($result->cimart_requested_at->isToday());
            $this->assertNull($result->cimart_decided_at);
            $this->assertNull($result->cimart_note);
            $this->assertNull($result->cimart_cancelled_at);
        }

        // Masih menunggu atau sudah diterima: tidak bisa mendaftar lagi.
        foreach ([CimartApplicationStatus::Pending, CimartApplicationStatus::Accepted] as $status) {
            $business = $this->business($status);

            $this->assertAborts(409, fn () => $service->requestCimart($business));
            $this->assertSame($status, $business->fresh()->cimart_status);
        }

        // SKU kedaluwarsa: harus mengajukan SKU baru.
        $expired = $this->business(CimartApplicationStatus::Rejected, now()->subDay());
        $this->assertAborts(422, fn () => $service->requestCimart($expired));
        $this->assertSame(CimartApplicationStatus::Rejected, $expired->fresh()->cimart_status);
    }

    public function test_only_a_pending_registration_can_be_cancelled_and_it_is_logged(): void
    {
        $service = app(CitizenBusinessService::class);
        $warga = $this->applicant['user'];

        $pending = $this->business(CimartApplicationStatus::Pending);
        $cancelled = $service->cancelCimart($pending, $warga)->fresh();

        $this->assertSame(CimartApplicationStatus::Cancelled, $cancelled->cimart_status);
        $this->assertTrue($cancelled->cimart_cancelled_at->isToday());

        $log = Activity::query()->where('log_name', 'citizen_business')->sole();
        $this->assertSame('cimart_cancelled', $log->event);
        $this->assertTrue($log->causer->is($warga));
        $this->assertTrue($log->subject->is($pending));
        $this->assertSame($this->village->id, $log->properties['village_id']);

        foreach ([null, CimartApplicationStatus::Accepted, CimartApplicationStatus::Rejected, CimartApplicationStatus::Cancelled] as $status) {
            $business = $this->business($status);

            $this->assertAborts(409, fn () => $service->cancelCimart($business, $warga));
            $this->assertSame($status, $business->fresh()->cimart_status);
        }

        $this->assertSame(1, Activity::query()->where('log_name', 'citizen_business')->count());
    }

    /**
     * @param  array<string, string>  $overrides
     */
    private function issueBusinessLetter(array $overrides = []): string
    {
        $letterId = $this->submitBusinessLetter($overrides);

        $this->decide($this->rtApprover['user'], 'rt', $letterId, 'approved');
        $this->decide($this->kades['user'], 'kades', $letterId, 'approved');

        return $letterId;
    }

    /**
     * @param  array<string, string>  $overrides
     */
    private function submitBusinessLetter(array $overrides = []): string
    {
        return $this->actingAs($this->applicant['user'])
            ->post('/api/letters', [
                'letter_type_id' => $this->letterType('A01')->id,
                'payload' => [
                    'kegiatan_usaha' => 'Warung kopi',
                    'nama_usaha' => 'Warung Kopi Joni',
                    'kategori_usaha' => 'kuliner',
                    'alamat_usaha' => 'Jl. Raya Cibenda No. 12, RT 01/RW 02',
                    'email_usaha' => 'warkopjoni@example.com',
                    'telepon_usaha' => '081234567890',
                    'daftar_cimart' => 'ya',
                    ...$overrides,
                ],
                'files' => ['foto_usaha' => UploadedFile::fake()->image('usaha.jpg')],
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('data.id');
    }

    private function decide(User $user, string $level, string $letterId, string $status): void
    {
        $this->actingAs($user)
            ->patchJson("/api/{$level}/letters/{$letterId}/decision", [
                'status' => $status,
                ...($status === 'rejected' ? ['notes' => 'Foto usaha tidak jelas.'] : []),
            ])
            ->assertOk();
    }

    private function letterType(string $code): LetterType
    {
        return LetterType::query()
            ->where('village_id', $this->village->id)
            ->where('code', $code)
            ->firstOrFail();
    }

    private function business(?CimartApplicationStatus $status, ?DateTimeInterface $expiresAt = null): CitizenBusiness
    {
        $letter = Letter::factory()->create([
            'village_id' => $this->village->id,
            'letter_type_id' => $this->letterType('A01')->id,
            'status' => 'approved',
            'expires_at' => $expiresAt ?? now()->addYear(),
        ]);
        $factory = CitizenBusiness::factory()->state(['letter_id' => $letter->id]);

        return ($status === null ? $factory : $factory->cimart($status))->create();
    }

    private function assertAborts(int $status, callable $callback): void
    {
        try {
            $callback();
        } catch (HttpException $exception) {
            $this->assertSame($status, $exception->getStatusCode());

            return;
        }

        $this->fail("Diharapkan abort {$status}.");
    }
}
