<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Village;
use App\Notifications\LetterStatusNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Formulir pelayanan: setelah terbit, pemohon mengunggah hasil dari
 * instansi luar pada surat yang sama, Kasi/Kaur yang ditugaskan
 * memverifikasinya, lalu perubahan data baru dapat diterapkan.
 */
class LetterResultUploadTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $rtApprover;

    private array $kades;

    private array $kasi;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');

        $this->village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($this->village);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', ['address' => 'Alamat Lama']);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
        $this->kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village);
    }

    public function test_applicant_uploads_the_result_and_kasi_verifies_it_on_the_same_letter(): void
    {
        $letterId = $this->approve($this->serviceType());

        $this->detail($this->applicant['user'], $letterId)
            ->assertJsonPath('data.result_stage', 'awaiting_upload')
            ->assertJsonPath('data.result_upload_hint', 'KK terbaru dari Disdukcapil')
            ->assertJsonPath('data.can_upload_result', true)
            ->assertJsonPath('data.needs_fulfillment', false);
        Notification::assertSentTo(
            $this->applicant['user'],
            LetterStatusNotification::class,
            fn (LetterStatusNotification $notification, array $channels, object $notifiable) => str_contains($notification->toArray($notifiable)['message'], 'unggah hasilnya'),
        );
        // Kasi diberi tahu formulir terbit; verifikasi menunggu unggahan.
        Notification::assertSentTo(
            $this->kasi['user'],
            LetterStatusNotification::class,
            fn (LetterStatusNotification $notification, array $channels, object $notifiable) => $notification->toArray($notifiable)['context']['status'] === 'letter_awaiting_result',
        );

        // Hanya pemohon yang dapat mengunggah, dan minimal satu berkas.
        $this->upload($this->kasi['user'], $letterId)->assertForbidden();
        $this->actingAs($this->applicant['user'])
            ->post("/api/letters/{$letterId}/results", [], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('files');

        $first = $this->upload($this->applicant['user'], $letterId)->assertCreated()->json('data');
        $this->assertSame('submitted', $first['status']);
        $this->assertCount(2, $first['attachments']);
        Notification::assertSentTo($this->kasi['user'], LetterStatusNotification::class);

        // Selama diverifikasi, pemohon tidak dapat mengunggah lagi.
        $this->upload($this->applicant['user'], $letterId)->assertForbidden();

        $detail = $this->detail($this->kasi['user'], $letterId)
            ->assertJsonPath('data.result_stage', 'under_review')
            ->assertJsonPath('data.can_review_result', true)
            ->assertJsonCount(1, 'data.results')
            // Berkas hasil tidak tercampur dengan lampiran pengajuan.
            ->assertJsonCount(0, 'data.attachments')
            ->json('data');
        $this->actingAs($this->kasi['user'])
            ->get($detail['results'][0]['attachments'][0]['url'])
            ->assertOk();

        // Penolakan wajib beralasan, lalu pemohon dapat mengunggah ulang.
        $this->review($this->kasi['user'], $letterId, $first['id'], ['decision' => 'rejected'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('notes');
        $this->review($this->kasi['user'], $letterId, $first['id'], ['decision' => 'rejected', 'notes' => 'Foto KK buram.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected');
        $this->detail($this->applicant['user'], $letterId)
            ->assertJsonPath('data.result_stage', 'awaiting_upload')
            ->assertJsonPath('data.results.0.review_notes', 'Foto KK buram.')
            // Pemohon dapat mengunggah ulang di surat yang sama.
            ->assertJsonPath('data.can_upload_result', true);
        $this->actingAs($this->applicant['user'])
            ->getJson('/api/letters')
            ->assertJsonPath('data.0.result_rejected', true);

        $second = $this->upload($this->applicant['user'], $letterId)->assertCreated()->json('data');
        // Unggahan lama sudah diverifikasi dan tidak dapat diputus ulang.
        $this->review($this->kasi['user'], $letterId, $first['id'], ['decision' => 'accepted'])->assertStatus(409);
        $this->review($this->kasi['user'], $letterId, $second['id'], ['decision' => 'accepted'])->assertOk();

        $this->detail($this->applicant['user'], $letterId)
            ->assertJsonPath('data.result_stage', 'accepted')
            ->assertJsonPath('data.can_upload_result', false)
            ->assertJsonCount(2, 'data.results');
        $this->assertSame(
            ['Hasil dari instansi diunggah pemohon', 'Hasil dari instansi ditolak: Foto KK buram.', 'Hasil dari instansi diunggah pemohon', 'Hasil dari instansi diterima'],
            Letter::query()->findOrFail($letterId)->statusLogs()->where('reason', 'like', 'Hasil%')->reorder('id')->pluck('reason')->all(),
        );
    }

    public function test_data_changes_wait_until_the_result_is_accepted(): void
    {
        $letterId = $this->approve($this->serviceType([
            'data_action' => 'update_citizen',
            'data_fields' => [['column' => 'address', 'label' => 'Alamat', 'source' => 'alamat_baru']],
            'form_fields' => [['name' => 'alamat_baru', 'label' => 'Alamat Baru', 'type' => 'text', 'required' => true]],
        ]), ['alamat_baru' => 'Alamat Baru']);

        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment")
            ->assertStatus(409);

        $result = $this->upload($this->applicant['user'], $letterId)->json('data');
        $this->actingAs($this->kasi['user'])->postJson("/api/letters/{$letterId}/fulfillment")->assertStatus(409);
        $this->detail($this->kasi['user'], $letterId)->assertJsonPath('data.needs_fulfillment', false);

        $this->review($this->kasi['user'], $letterId, $result['id'], ['decision' => 'accepted'])->assertOk();
        $this->detail($this->kasi['user'], $letterId)->assertJsonPath('data.needs_fulfillment', true);
        $this->actingAs($this->kasi['user'])->postJson("/api/letters/{$letterId}/fulfillment")->assertOk();

        $this->assertSame('Alamat Baru', $this->applicant['citizen']->fresh()->address);
    }

    public function test_only_the_assigned_role_reviews_and_letters_without_upload_have_no_stage(): void
    {
        $kaur = $this->makeOfficialUser('kaur_tu_umum', $this->village);
        $letterId = $this->approve($this->serviceType());
        $result = $this->upload($this->applicant['user'], $letterId)->json('data');

        $this->review($kaur['user'], $letterId, $result['id'], ['decision' => 'accepted'])->assertForbidden();

        $plain = $this->approve(LetterType::factory()->create([
            'village_id' => $this->village->id,
            'flow_id' => $this->makeDefaultFlow()->id,
            'template' => '<p>SURAT</p>',
            'form_fields' => [],
        ]));
        $this->detail($this->applicant['user'], $plain)
            ->assertJsonPath('data.result_stage', null)
            ->assertJsonPath('data.can_upload_result', false);
        $this->upload($this->applicant['user'], $plain)->assertForbidden();
        $this->actingAs($this->applicant['user'])
            ->getJson('/api/letters')
            ->assertOk()
            ->assertJsonPath('data.1.result_stage', 'under_review');
    }

    public function test_kasi_verifies_their_own_result_and_staf_cannot_verify(): void
    {
        $petugas = $this->makeOfficialUser('staf_sid', $this->village);
        $letterId = $this->approve($this->serviceType());
        // Surat milik Kasi yang ditugaskan sendiri.
        Letter::query()->whereKey($letterId)->update(['submitted_by' => $this->kasi['user']->id, 'citizen_id' => $this->kasi['citizen']->id]);
        $result = $this->upload($this->kasi['user'], $letterId)->assertCreated()->json('data');

        // Staf SIDUTama bukan cadangan verifikasi.
        $this->detail($petugas['user'], $letterId)->assertJsonPath('data.can_review_result', false);
        $this->review($petugas['user'], $letterId, $result['id'], ['decision' => 'accepted'])->assertForbidden();

        $this->detail($this->kasi['user'], $letterId)->assertJsonPath('data.can_review_result', true);
        $this->review($this->kasi['user'], $letterId, $result['id'], ['decision' => 'accepted'])->assertOk();
        $this->assertDatabaseHas('letter_status_logs', [
            'letter_id' => $letterId,
            'reason' => 'Hasil dari instansi diterima oleh pemohon sendiri',
        ]);
    }

    private function serviceType(array $attributes = []): LetterType
    {
        return LetterType::factory()->create([
            'village_id' => $this->village->id,
            'flow_id' => $this->makeDefaultFlow()->id,
            'category' => 'pelayanan',
            'assigned_role' => 'kasi_pemerintahan',
            'template' => '<p>FORMULIR {{ applicant_name }}</p>',
            'form_fields' => [],
            'issues_letter_number' => false,
            'signed_by_village_head' => false,
            'requires_result_upload' => true,
            'result_upload_hint' => 'KK terbaru dari Disdukcapil',
            ...$attributes,
        ]);
    }

    private function approve(LetterType $letterType, array $payload = []): string
    {
        $letterId = $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $letterType->id,
                ...($payload === [] ? [] : ['payload' => $payload]),
            ])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($this->rtApprover['user'])
            ->patchJson("/api/rt/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();
        $this->actingAs($this->kades['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();

        return $letterId;
    }

    private function upload($user, string $letterId)
    {
        return $this->actingAs($user)->post("/api/letters/{$letterId}/results", [
            'files' => [
                UploadedFile::fake()->create('kk-baru.pdf', 100, 'application/pdf'),
                UploadedFile::fake()->image('kk-baru.jpg'),
            ],
        ], ['Accept' => 'application/json']);
    }

    private function review($user, string $letterId, int $resultId, array $data)
    {
        return $this->actingAs($user)->patchJson("/api/letters/{$letterId}/results/{$resultId}", $data);
    }

    private function detail($user, string $letterId)
    {
        return $this->actingAs($user)->getJson("/api/letters/{$letterId}")->assertOk();
    }
}
