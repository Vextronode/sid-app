<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterSignature;
use App\Models\LetterType;
use App\Models\Rt;
use App\Models\SignatureBlock;
use App\Models\Village;
use App\Services\LetterSignatureService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Ganti, setujui, dan tolak saksi bersifat atomik: saksi pengganti yang
 * ditolak tidak mengubah apa pun, dan keputusan dari data usang (dua tab,
 * dua pihak) mendapat 409. Kejadian bersamaan tidak bisa direproduksi di
 * SQLite, jadi diuji dengan model usang: muat model, ubah datanya di
 * database, lalu panggil service-nya.
 */
class WitnessReplacementTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private const APPLICANT_NIK = '3207010101900010';

    private const WITNESS_NIK = '3207010101900011';

    private const BLOCKER_NIK = '3207010101900012';

    // Di luar data penduduk: dicatat manual.
    private const OUTSIDER_NIK = '3207010101900098';

    private const OTHER_OUTSIDER_NIK = '3207010101900099';

    private Village $village;

    private Rt $rt;

    private array $applicant;

    private array $witness;

    private LetterType $letterType;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->village = Village::factory()->create();
        ['rt' => $this->rt] = $this->makeArea($this->village);
        $this->applicant = $this->makeCitizenAccount($this->village, $this->rt, 'warga', ['nik' => self::APPLICANT_NIK]);
        $this->witness = $this->makeCitizenAccount($this->village, $this->rt, 'warga', ['nik' => self::WITNESS_NIK]);
        $this->makeOfficialUser('rt', $this->village, ['rt_id' => $this->rt->id]);
        $this->makeOfficialUser('kepala_desa', $this->village);
        $this->letterType = LetterType::factory()->create([
            'flow_id' => $this->makeDefaultFlow()->id,
            'template' => 'Surat {{ applicant_name }}',
            'form_fields' => [
                ['name' => 'nik_saksi_1', 'label' => 'NIK Saksi I', 'type' => 'nik', 'required' => true, 'witness' => 'Saksi I'],
                ['name' => 'nama_saksi_1', 'label' => 'Nama Saksi I', 'type' => 'text', 'required' => false, 'from_nik' => 'nik_saksi_1'],
                ['name' => 'nik_saksi_2', 'label' => 'NIK Saksi II', 'type' => 'nik', 'required' => false, 'witness' => 'Saksi II'],
                ['name' => 'nama_saksi_2', 'label' => 'Nama Saksi II', 'type' => 'text', 'required' => false, 'from_nik' => 'nik_saksi_2'],
            ],
        ]);
    }

    /**
     * @param  array<string, string>  $input
     */
    #[DataProvider('invalidReplacementProvider')]
    public function test_invalid_replacement_keeps_the_pending_request_and_payload(array $input, string $errorField): void
    {
        $blocker = $this->makeCitizenAccount($this->village, $this->rt, 'warga', ['nik' => self::BLOCKER_NIK]);
        SignatureBlock::query()->create([
            'user_id' => $blocker['user']->id,
            'blocked_user_id' => $this->applicant['user']->id,
        ]);

        $letterId = $this->submit()->assertCreated()->json('data.id');
        $pending = $this->pendingRequest($letterId);
        $payload = Letter::query()->findOrFail($letterId)->payload;

        $this->actingAs($this->applicant['user'])
            ->postJson("/api/letters/{$letterId}/signatures/nik_saksi_1", $input)
            ->assertUnprocessable()
            ->assertJsonValidationErrors($errorField);

        $this->assertSame(LetterSignature::STATUS_PENDING, $pending->fresh()->status);
        $this->assertSame($payload, Letter::query()->findOrFail($letterId)->payload);
        $this->assertSame(1, LetterSignature::query()->where('letter_id', $letterId)->count());
    }

    /**
     * @return array<string, array{0: array<string, string>, 1: string}>
     */
    public static function invalidReplacementProvider(): array
    {
        return [
            'NIK di luar data penduduk tanpa nama' => [['nik' => self::OUTSIDER_NIK], 'name'],
            'NIK pemohon sendiri' => [['nik' => self::APPLICANT_NIK], 'nik'],
            'NIK yang memblokir pemohon' => [['nik' => self::BLOCKER_NIK], 'nik'],
        ];
    }

    public function test_valid_replacement_cancels_the_pending_request(): void
    {
        $letterId = $this->submit()->assertCreated()->json('data.id');
        $pending = $this->pendingRequest($letterId);

        $this->actingAs($this->applicant['user'])
            ->postJson("/api/letters/{$letterId}/signatures/nik_saksi_1", ['nik' => self::OUTSIDER_NIK, 'name' => 'Saksi Luar'])
            ->assertOk()
            ->assertJsonPath('data.method', LetterSignature::METHOD_MANUAL);

        $this->assertSame(LetterSignature::STATUS_CANCELLED, $pending->fresh()->status);
        $this->assertSame('Saksi Luar', Letter::query()->findOrFail($letterId)->payload['nama_saksi_1']);
    }

    public function test_replacing_two_slots_from_stale_letters_keeps_both_changes(): void
    {
        $letterId = $this->submit()->assertCreated()->json('data.id');
        // Tab A memuat surat; tab B lalu mengisi Saksi II lebih dulu.
        $staleTab = Letter::query()->findOrFail($letterId);
        $this->service()->refillSlot(
            Letter::query()->findOrFail($letterId),
            $this->applicant['user'],
            'nik_saksi_2',
            ['nik' => self::OUTSIDER_NIK, 'name' => 'Saksi Dua'],
        );

        $this->service()->refillSlot(
            $staleTab,
            $this->applicant['user'],
            'nik_saksi_1',
            ['nik' => self::OTHER_OUTSIDER_NIK, 'name' => 'Saksi Satu'],
        );

        $payload = Letter::query()->findOrFail($letterId)->payload;
        $this->assertSame(self::OTHER_OUTSIDER_NIK, $payload['nik_saksi_1']);
        $this->assertSame('Saksi Satu', $payload['nama_saksi_1']);
        $this->assertSame(self::OUTSIDER_NIK, $payload['nik_saksi_2']);
        $this->assertSame('Saksi Dua', $payload['nama_saksi_2']);
    }

    public function test_accept_and_reject_on_a_stale_request_are_409(): void
    {
        $letterId = $this->submit()->assertCreated()->json('data.id');
        $stale = $this->pendingRequest($letterId);

        // Pemohon baru saja mengganti saksi: permintaan yang dimuat saksi sudah dibatalkan.
        LetterSignature::query()->whereKey($stale->id)->update(['status' => LetterSignature::STATUS_CANCELLED]);

        $this->assertAborts(409, fn () => $this->service()->accept($stale, $this->witness['user']));
        $this->assertAborts(409, fn () => $this->service()->reject($stale, $this->witness['user'], null, true));

        $this->assertSame(LetterSignature::STATUS_CANCELLED, $stale->fresh()->status);
        $this->assertNull($stale->fresh()->signer_user_id);
        $this->assertSame(0, SignatureBlock::query()->count());
    }

    public function test_refill_on_a_stale_letter_is_409(): void
    {
        $letterId = $this->submit()->assertCreated()->json('data.id');
        $staleLetter = Letter::query()->findOrFail($letterId);
        $request = $this->pendingRequest($letterId);
        $refill = fn () => $this->service()->refillSlot(
            $staleLetter,
            $this->applicant['user'],
            'nik_saksi_1',
            ['nik' => self::OUTSIDER_NIK, 'name' => 'Saksi Luar'],
        );

        // Saksi menyetujui setelah surat dimuat pemohon.
        LetterSignature::query()->whereKey($request->id)->update(['status' => LetterSignature::STATUS_SIGNED]);
        $this->assertAborts(409, $refill);
        $this->assertSame(LetterSignature::STATUS_SIGNED, $request->fresh()->status);

        // Surat sudah masuk tahap approval setelah dimuat pemohon.
        LetterSignature::query()->whereKey($request->id)->update(['status' => LetterSignature::STATUS_PENDING]);
        Letter::query()->whereKey($letterId)->update(['current_step_order' => 1]);
        $this->assertAborts(409, $refill);
        $this->assertSame(LetterSignature::STATUS_PENDING, $request->fresh()->status);

        $this->assertSame($staleLetter->payload, Letter::query()->findOrFail($letterId)->payload);
        $this->assertSame(1, LetterSignature::query()->where('letter_id', $letterId)->count());
    }

    private function service(): LetterSignatureService
    {
        return app(LetterSignatureService::class);
    }

    private function pendingRequest(string $letterId): LetterSignature
    {
        return LetterSignature::query()
            ->where('letter_id', $letterId)
            ->where('status', LetterSignature::STATUS_PENDING)
            ->sole();
    }

    private function assertAborts(int $status, callable $call): void
    {
        try {
            $call();
            $this->fail("Seharusnya ditolak dengan status {$status}.");
        } catch (HttpException $e) {
            $this->assertSame($status, $e->getStatusCode());
        }
    }

    private function submit(): TestResponse
    {
        return $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $this->letterType->id,
                'payload' => ['nik_saksi_1' => self::WITNESS_NIK],
            ]);
    }
}
