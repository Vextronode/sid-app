<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Letter;
use App\Models\LetterSignature;
use App\Models\LetterType;
use App\Models\Village;
use App\Notifications\LetterStatusNotification;
use App\Services\LetterService;
use Database\Seeders\ApprovalFlowSeeder;
use Database\Seeders\ServiceLetterTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Persetujuan saksi (isian NIK ber-`witness`, contoh F06): warga desa yang
 * punya akun menyetujui per surat sebelum surat masuk ke RT; warga tanpa
 * akun dicatat untuk diverifikasi RT; NIK di luar data penduduk = manual.
 * Pembatas penolakan dan masa berlaku 3 hari sama dengan permintaan TTD.
 */
class WitnessConsentTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $witness;

    private Citizen $mother;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->village = Village::factory()->create();
        $this->seed([ApprovalFlowSeeder::class, ServiceLetterTypeSeeder::class]);

        $rt = $this->makeNamedArea($this->village, 'Budiasih', '19', '2');
        $family = Family::factory()->create(['village_id' => $this->village->id]);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'family_id' => $family->id,
            'family_role' => 'kepala_keluarga',
        ]);
        $this->mother = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'family_id' => $family->id,
            'family_role' => 'istri',
        ]);
        $witnessFamily = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218010101900009']);
        $this->witness = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'name' => 'Ujang Saksi',
            'nik' => '3207010101800009',
            'family_id' => $witnessFamily->id,
        ]);
    }

    public function test_witness_with_an_account_must_consent_before_the_letter_reaches_the_rt(): void
    {
        // Sebelum setuju: nama disamarkan dan No. KK tidak dibuka.
        $this->actingAs($this->applicant['user'])
            ->getJson('/api/profile/nik-lookup?nik=3207010101800009')
            ->assertJsonPath('data', ['found' => true, 'has_account' => true, 'name' => 'U***g S***i', 'family_number' => null]);

        $letterId = $this->submit()->assertCreated()->json('data.id');
        $letter = Letter::query()->findOrFail($letterId);

        $this->assertSame(LetterService::AWAITING_SIGNATURES_STEP, $letter->current_step_order);
        $request = LetterSignature::query()->where('letter_id', $letterId)->where('slot_key', 'nik_saksi_1')->firstOrFail();
        $this->assertSame(LetterSignature::SIGNER_WITNESS, $request->signer_type);
        $this->assertSame(LetterSignature::STATUS_PENDING, $request->status);
        $this->assertTrue($request->expires_at->between(now()->addDays(3)->subMinute(), now()->addDays(3)->addMinute()));
        Notification::assertSentTo(
            $this->witness['user'],
            LetterStatusNotification::class,
            fn (LetterStatusNotification $notification, array $channels, object $notifiable) => $notification->toArray($notifiable)['title'] === 'Permintaan Menjadi Saksi',
        );
        // Saksi II di luar data penduduk: manual, tidak ditunggu.
        $this->assertSame(
            LetterSignature::METHOD_MANUAL,
            LetterSignature::query()->where('letter_id', $letterId)->where('slot_key', 'nik_saksi_2')->value('method'),
        );

        $this->actingAs($this->witness['user'])
            ->getJson('/api/signature-requests')
            ->assertJsonPath('data.0.signer_type', 'witness')
            ->assertJsonPath('data.0.slot_label', 'Saksi I');
        // Saksi tidak perlu punya tanda tangan untuk menyetujui.
        $this->actingAs($this->witness['user'])
            ->postJson("/api/signature-requests/{$request->id}/accept", ['password' => 'Password123'])
            ->assertOk();

        $this->assertSame(1, $letter->fresh()->current_step_order);
        $this->assertSame('Ujang Saksi', $request->fresh()->signer_name);
        $this->assertSame('3218010101900009', $letter->fresh()->payload['kk_saksi_1']);
    }

    public function test_witness_without_an_account_is_filled_from_population_data_for_rt_to_verify(): void
    {
        $this->witness['user']->delete();

        $this->actingAs($this->applicant['user'])
            ->getJson('/api/profile/nik-lookup?nik=3207010101800009')
            ->assertJsonPath('data', ['found' => true, 'has_account' => false, 'name' => 'Ujang Saksi', 'family_number' => '3218010101900009']);

        $letterId = $this->submit()->assertCreated()->json('data.id');

        $this->assertSame(1, Letter::query()->findOrFail($letterId)->current_step_order);
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.signatures.0.slot_label', 'Saksi I')
            ->assertJsonPath('data.signatures.0.method', 'rt_check')
            ->assertJsonPath('data.signatures.0.signer_name', 'Ujang Saksi');
    }

    public function test_rejected_witness_can_be_replaced_and_three_rejections_block_the_nik_for_a_day(): void
    {
        $letterId = $this->submit()->assertCreated()->json('data.id');
        $this->reject($letterId);

        // Ganti dengan saksi di luar data penduduk pada surat yang sama.
        $this->actingAs($this->applicant['user'])
            ->postJson("/api/letters/{$letterId}/signatures/nik_saksi_1", ['nik' => '3207010101800077', 'name' => 'Saksi Luar'])
            ->assertOk();
        $letter = Letter::query()->findOrFail($letterId);
        $this->assertSame('Saksi Luar', $letter->payload['nama_saksi_1']);
        $this->assertSame(1, $letter->current_step_order);

        // Dua penolakan lagi dari NIK yang sama: NIK itu tidak dapat dipakai 24 jam.
        $this->reject($this->submit()->json('data.id'));
        $this->reject($this->submit()->json('data.id'));
        $this->submit()->assertUnprocessable()->assertJsonValidationErrors('payload.nik_saksi_1');

        $this->travel(25)->hours();
        $this->submit()->assertCreated();
    }

    private function reject(string $letterId): void
    {
        $request = LetterSignature::query()->where('letter_id', $letterId)->where('slot_key', 'nik_saksi_1')->firstOrFail();

        $this->actingAs($this->witness['user'])
            ->postJson("/api/signature-requests/{$request->id}/reject")
            ->assertOk();
    }

    private function submit(): TestResponse
    {
        return $this->actingAs($this->applicant['user'])->postJson('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F06')->value('id'),
            'payload' => [
                'almarhum' => $this->mother->id,
                'tanggal_kematian' => '2026-10-05',
                'pukul_kematian' => '15:00',
                'sebab_kematian' => 'sakit',
                'tempat_kematian' => 'RSUD',
                'yang_menerangkan' => 'dokter',
                'nik_saksi_1' => '3207010101800009',
                'nik_saksi_2' => '3207010101800002',
                'nama_saksi_2' => 'Saksi Dua',
            ],
        ]);
    }
}
