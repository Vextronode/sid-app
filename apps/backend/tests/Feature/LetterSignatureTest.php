<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterAttachment;
use App\Models\LetterSignature;
use App\Models\LetterType;
use App\Models\User;
use App\Models\UserSignature;
use App\Models\Village;
use App\Notifications\LetterStatusNotification;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

class LetterSignatureTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private const WITNESS_NIK = '3207010101900001';

    private Village $village;

    private array $applicant;

    private array $witness;

    private array $rtApprover;

    private LetterType $letterType;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');

        $this->village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($this->village);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt);
        $this->witness = $this->makeCitizenAccount($this->village, $rt, 'warga', ['nik' => self::WITNESS_NIK]);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->makeOfficialUser('kepala_desa', $this->village);
        $this->letterType = LetterType::factory()->create([
            'flow_id' => $this->makeDefaultFlow()->id,
            'template' => 'Surat {{ applicant_name }}',
            'supporting_template' => 'Pernyataan {{ applicant_name }} | {{ nama_ttd_pemohon }} {{ ttd_pemohon }} | {{ nama_ttd_saksi }} {{ ttd_saksi }}',
            'signature_slots' => [
                ['key' => 'pemohon', 'label' => 'Pemohon', 'signer' => 'applicant'],
                ['key' => 'saksi', 'label' => 'Saksi', 'signer' => 'other'],
            ],
        ]);
    }

    public function test_account_signature_is_set_once_and_stored_encrypted(): void
    {
        $user = $this->applicant['user'];
        $file = UploadedFile::fake()->image('ttd.png', 200, 80);
        $original = $file->getContent();

        $this->actingAs($user)->getJson('/api/profile/signature')
            ->assertOk()
            ->assertJsonPath('data.has_signature', false);

        $this->actingAs($user)
            ->post('/api/profile/signature', ['signature' => $file], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.has_signature', true);

        $signature = UserSignature::query()->where('user_id', $user->id)->firstOrFail();
        $this->assertNotSame($original, Storage::disk('private_uploads')->get($signature->path));
        $this->assertSame($original, $this->actingAs($user)->get('/api/profile/signature/image')->assertOk()->getContent());

        // Tidak dapat diganti sendiri.
        $this->actingAs($user)
            ->post('/api/profile/signature', ['signature' => UploadedFile::fake()->image('baru.png')], ['Accept' => 'application/json'])
            ->assertStatus(409);
        $this->assertSame(1, UserSignature::query()->where('user_id', $user->id)->count());
    }

    public function test_only_petugas_desa_of_the_same_village_can_reset_a_signature_and_old_file_is_kept(): void
    {
        $user = $this->applicant['user'];
        $this->giveSignature($user);
        $old = UserSignature::query()->where('user_id', $user->id)->firstOrFail();
        $petugas = $this->makeOfficialUser('petugas_desa', $this->village);
        $foreignPetugas = $this->makeOfficialUser('petugas_desa', Village::factory()->create());

        $this->actingAs($this->rtApprover['user'])
            ->postJson("/api/users/{$user->id}/signature/reset", ['reason' => 'Salah unggah gambar'])
            ->assertForbidden();
        $this->actingAs($foreignPetugas['user'])
            ->postJson("/api/users/{$user->id}/signature/reset", ['reason' => 'Salah unggah gambar'])
            ->assertForbidden();
        $this->actingAs($petugas['user'])
            ->postJson("/api/users/{$user->id}/signature/reset", [])
            ->assertStatus(422);

        $this->actingAs($petugas['user'])
            ->postJson("/api/users/{$user->id}/signature/reset", ['reason' => 'Salah unggah gambar'])
            ->assertOk();

        $old->refresh();
        $this->assertNotNull($old->revoked_at);
        $this->assertSame($petugas['user']->id, $old->revoked_by);
        Storage::disk('private_uploads')->assertExists($old->path);
        $this->assertDatabaseHas('activity_log', ['log_name' => 'user_signature', 'event' => 'reset']);

        // Setelah reset, pemilik akun dapat mengisi tanda tangan baru.
        $this->giveSignature($user);
        $this->assertSame(2, UserSignature::query()->where('user_id', $user->id)->count());
    }

    public function test_applicant_must_have_a_signature_before_submitting_a_letter_with_applicant_slot(): void
    {
        $this->submit(['signers' => ['saksi' => ['nik' => self::WITNESS_NIK]]])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['signers.pemohon']);

        $this->assertDatabaseCount('letters', 0);
    }

    public function test_letter_waits_for_the_other_party_and_enters_approval_once_they_accept(): void
    {
        $this->giveSignature($this->applicant['user']);

        $letterId = $this->submit(['signers' => ['saksi' => ['nik' => self::WITNESS_NIK]]])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.awaiting_signatures', true)
            ->json('data.id');

        // Belum masuk ke approver.
        $this->assertSame(0, Letter::query()->findOrFail($letterId)->current_step_order);
        $this->assertDatabaseMissing('letter_approvals', ['letter_id' => $letterId]);
        Notification::assertNotSentTo($this->rtApprover['user'], LetterStatusNotification::class);
        $this->actingAs($this->rtApprover['user'])
            ->patchJson("/api/rt/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertStatus(409);

        // Pemohon tidak mendapat data pemilik NIK sebelum disetujui.
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertOk()
            ->assertJsonPath('data.signatures.0.status', 'signed')
            ->assertJsonPath('data.signatures.1.slot_key', 'saksi')
            ->assertJsonPath('data.signatures.1.status', 'pending')
            ->assertJsonPath('data.signatures.1.signer_name', null);

        // Pemilik NIK melihat ringkasan surat lalu menyetujui.
        Notification::assertSentTo(
            $this->witness['user'],
            LetterStatusNotification::class,
            fn (LetterStatusNotification $n): bool => $n->toArray($this->witness['user'])['context']['status'] === 'signature_requested',
        );
        $requestId = $this->actingAs($this->witness['user'])
            ->getJson('/api/signature-requests')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slot_label', 'Saksi')
            ->assertJsonPath('data.0.applicant_name', $this->applicant['citizen']->name)
            ->json('data.0.id');

        // Orang lain tidak dapat menyetujui atas namanya.
        $this->actingAs($this->rtApprover['user'])
            ->postJson("/api/signature-requests/{$requestId}/accept", ['password' => 'Password123'])
            ->assertNotFound();

        // Kata sandi diminta ulang sebelum tanda tangan dibubuhkan.
        $this->actingAs($this->witness['user'])
            ->postJson("/api/signature-requests/{$requestId}/accept", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
        $this->actingAs($this->witness['user'])
            ->postJson("/api/signature-requests/{$requestId}/accept", ['password' => 'salah-sandi'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        // Harus punya tanda tangan sendiri dulu.
        $this->actingAs($this->witness['user'])
            ->postJson("/api/signature-requests/{$requestId}/accept", ['password' => 'Password123'])
            ->assertStatus(422);
        $this->giveSignature($this->witness['user']);
        $this->actingAs($this->witness['user'])
            ->postJson("/api/signature-requests/{$requestId}/accept", ['password' => 'Password123'])
            ->assertOk();

        $letter = Letter::query()->findOrFail($letterId);
        $this->assertSame(1, $letter->current_step_order);
        $this->assertDatabaseHas('letter_approvals', ['letter_id' => $letterId, 'approval_level' => 'rt']);
        Notification::assertSentTo($this->rtApprover['user'], LetterStatusNotification::class);

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.awaiting_signatures', false)
            ->assertJsonPath('data.signatures.1.status', 'signed')
            ->assertJsonPath('data.signatures.1.signer_name', $this->witness['citizen']->name);

        $this->actingAs($this->rtApprover['user'])
            ->patchJson("/api/rt/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();
    }

    public function test_request_to_a_nik_without_account_looks_the_same_to_the_applicant(): void
    {
        $this->giveSignature($this->applicant['user']);

        $this->submit(['signers' => ['saksi' => ['nik' => '3299999999999999']]])
            ->assertCreated()
            ->assertJsonPath('data.awaiting_signatures', true);

        $this->assertDatabaseHas('letter_signatures', [
            'slot_key' => 'saksi',
            'status' => 'pending',
            'target_nik_hash' => hash('sha256', '3299999999999999'),
        ]);
    }

    public function test_applicant_cannot_name_themselves_as_the_other_party(): void
    {
        $this->giveSignature($this->applicant['user']);

        $this->submit(['signers' => ['saksi' => ['nik' => $this->applicant['citizen']->nik]]])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['signers.saksi.nik']);
    }

    public function test_wet_signature_upload_fills_the_slot_and_letter_goes_straight_to_approval(): void
    {
        $this->giveSignature($this->applicant['user']);

        $letterId = $this->submit([
            'signers' => ['saksi' => ['name' => 'Pak Saksi Tanpa Akun']],
            'signature_files' => ['saksi' => UploadedFile::fake()->image('pernyataan-ttd.jpg')],
        ])
            ->assertCreated()
            ->assertJsonPath('data.awaiting_signatures', false)
            ->json('data.id');

        $this->assertSame(1, Letter::query()->findOrFail($letterId)->current_step_order);
        $this->assertDatabaseHas('letter_signatures', [
            'letter_id' => $letterId,
            'slot_key' => 'saksi',
            'method' => 'wet',
            'status' => 'signed',
            'signer_name' => 'Pak Saksi Tanpa Akun',
        ]);
        $this->assertSame(
            LetterAttachment::KIND_WET_SIGNATURE,
            LetterAttachment::query()->where('letter_id', $letterId)->value('kind'),
        );
    }

    public function test_wet_signature_requires_the_signer_name(): void
    {
        $this->giveSignature($this->applicant['user']);

        $this->submit([
            'signature_files' => ['saksi' => UploadedFile::fake()->image('pernyataan-ttd.jpg')],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['signers.saksi.name']);
    }

    public function test_rejected_request_can_be_replaced_by_wet_signature(): void
    {
        $this->giveSignature($this->applicant['user']);
        $letterId = $this->submit(['signers' => ['saksi' => ['nik' => self::WITNESS_NIK]]])->json('data.id');
        $requestId = LetterSignature::query()->where('status', 'pending')->value('id');

        $this->actingAs($this->witness['user'])
            ->postJson("/api/signature-requests/{$requestId}/reject", ['notes' => 'Saya tidak mengenal pemohon'])
            ->assertOk();

        Notification::assertSentTo(
            $this->applicant['user'],
            LetterStatusNotification::class,
            fn (LetterStatusNotification $n): bool => $n->toArray($this->applicant['user'])['context']['status'] === 'signature_rejected',
        );
        $this->assertSame(0, Letter::query()->findOrFail($letterId)->current_step_order);
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.signatures.1.status', 'rejected')
            ->assertJsonPath('data.signatures.1.signer_name', null);

        // Hanya pemohon yang boleh mengisi ulang slot.
        $this->actingAs($this->witness['user'])
            ->post("/api/letters/{$letterId}/signatures/saksi", [
                'name' => 'Orang Lain',
                'file' => UploadedFile::fake()->image('ttd.jpg'),
            ], ['Accept' => 'application/json'])
            ->assertForbidden();

        $this->actingAs($this->applicant['user'])
            ->post("/api/letters/{$letterId}/signatures/saksi", [
                'name' => 'Saksi Pengganti',
                'file' => UploadedFile::fake()->image('ttd.jpg'),
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.status', 'signed');

        $this->assertSame(1, Letter::query()->findOrFail($letterId)->current_step_order);
    }

    public function test_repeated_rejections_limit_requests_to_that_person_only(): void
    {
        config(['letters.signature.max_rejections' => 2]);
        $this->giveSignature($this->applicant['user']);
        $other = $this->makeCitizenAccount($this->village, null, 'warga', ['nik' => '3207010101900002']);

        foreach ([1, 2] as $attempt) {
            $this->submit(['signers' => ['saksi' => ['nik' => self::WITNESS_NIK]]])->assertCreated();
            $requestId = LetterSignature::query()->where('status', 'pending')->value('id');
            $this->actingAs($this->witness['user'])
                ->postJson("/api/signature-requests/{$requestId}/reject")
                ->assertOk();
        }

        // Ke orang yang sama: ditahan. Tidak ada surat baru yang terbuat.
        $lettersBefore = Letter::query()->count();
        $this->submit(['signers' => ['saksi' => ['nik' => self::WITNESS_NIK]]])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['signers.saksi.nik']);
        $this->assertSame($lettersBefore, Letter::query()->count());

        // Ke orang lain, dan pengajuan surat lain, tetap bisa.
        $this->submit(['signers' => ['saksi' => ['nik' => $other['citizen']->nik]]])->assertCreated();

        // Setelah rentang waktunya lewat, boleh meminta lagi.
        $this->travel(config('letters.signature.rejection_window_hours') + 1)->hours();
        $this->submit(['signers' => ['saksi' => ['nik' => self::WITNESS_NIK]]])->assertCreated();
    }

    public function test_recipient_can_block_a_requester_and_later_unblock(): void
    {
        $this->giveSignature($this->applicant['user']);
        $this->submit(['signers' => ['saksi' => ['nik' => self::WITNESS_NIK]]])->assertCreated();
        $requestId = LetterSignature::query()->where('status', 'pending')->value('id');

        $this->actingAs($this->witness['user'])
            ->postJson("/api/signature-requests/{$requestId}/reject", ['block' => true])
            ->assertOk();

        $this->submit(['signers' => ['saksi' => ['nik' => self::WITNESS_NIK]]])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['signers.saksi.nik']);

        $blockId = $this->actingAs($this->witness['user'])
            ->getJson('/api/signature-blocks')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->json('data.0.id');
        $this->actingAs($this->applicant['user'])
            ->deleteJson("/api/signature-blocks/{$blockId}")
            ->assertNotFound();
        $this->actingAs($this->witness['user'])
            ->deleteJson("/api/signature-blocks/{$blockId}")
            ->assertOk();

        $this->submit(['signers' => ['saksi' => ['nik' => self::WITNESS_NIK]]])->assertCreated();
    }

    public function test_expired_request_cannot_be_accepted_and_shows_as_expired(): void
    {
        $this->giveSignature($this->applicant['user']);
        $this->giveSignature($this->witness['user']);
        $letterId = $this->submit(['signers' => ['saksi' => ['nik' => self::WITNESS_NIK]]])->json('data.id');
        $requestId = LetterSignature::query()->where('status', 'pending')->value('id');

        $this->travel(config('letters.signature.request_ttl_days') + 1)->days();

        $this->actingAs($this->witness['user'])
            ->getJson('/api/signature-requests')
            ->assertJsonCount(0, 'data');
        $this->actingAs($this->witness['user'])
            ->postJson("/api/signature-requests/{$requestId}/accept", ['password' => 'Password123'])
            ->assertStatus(409);
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.signatures.1.status', 'expired');

        // Pemohon dapat mengajukan ulang ke NIK yang sama.
        $this->actingAs($this->applicant['user'])
            ->postJson("/api/letters/{$letterId}/signatures/saksi", ['nik' => self::WITNESS_NIK])
            ->assertOk()
            ->assertJsonPath('data.status', 'pending');
    }

    public function test_supporting_document_renders_signatures_and_is_limited_to_viewers_of_the_letter(): void
    {
        $this->giveSignature($this->applicant['user']);
        $this->giveSignature($this->witness['user']);
        $letterId = $this->submit(['signers' => ['saksi' => ['nik' => self::WITNESS_NIK]]])->json('data.id');
        $requestId = LetterSignature::query()->where('status', 'pending')->value('id');
        $this->actingAs($this->witness['user'])
            ->postJson("/api/signature-requests/{$requestId}/accept", ['password' => 'Password123'])
            ->assertOk();
        $outsider = $this->makeCitizenAccount($this->village, null);

        $rendered = null;
        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('stream')->once()->andReturn(new Response('', 200));
        $pdf->shouldReceive('download')->once()->andReturn(new Response('', 200));
        Pdf::shouldReceive('loadView')
            ->twice()
            ->with('pdf.templates.digital', Mockery::on(function (array $data) use (&$rendered): bool {
                $rendered = $data['template'];

                return true;
            }))
            ->andReturn($pdf);

        $this->actingAs($this->rtApprover['user'])
            ->get("/api/letters/{$letterId}/supporting-document")
            ->assertOk();
        $this->actingAs($this->applicant['user'])
            ->get("/api/letters/{$letterId}/supporting-document?download=1")
            ->assertOk();

        $this->assertStringContainsString('Pernyataan '.e($this->applicant['citizen']->name), $rendered);
        $this->assertStringContainsString(e($this->witness['citizen']->name), $rendered);
        $this->assertSame(2, substr_count($rendered, '<img src="data:image/png;base64,'));

        $this->actingAs($outsider['user'])
            ->getJson("/api/letters/{$letterId}/supporting-document")
            ->assertForbidden();
    }

    public function test_supporting_document_is_404_for_letter_types_without_one(): void
    {
        $plainType = LetterType::factory()->create(['flow_id' => $this->makeDefaultFlow()->id]);
        $letterId = $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', ['letter_type_id' => $plainType->id, 'purpose' => 'Keperluan'])
            ->assertCreated()
            ->assertJsonPath('data.awaiting_signatures', false)
            ->json('data.id');

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}/supporting-document")
            ->assertNotFound();
    }

    private function submit(array $extra = [])
    {
        return $this->actingAs($this->applicant['user'])
            ->post('/api/letters', [
                'letter_type_id' => $this->letterType->id,
                'purpose' => 'Keperluan',
                ...$extra,
            ], ['Accept' => 'application/json']);
    }

    private function giveSignature(User $user): void
    {
        $this->actingAs($user)
            ->post('/api/profile/signature', [
                'signature' => UploadedFile::fake()->image('ttd.png', 200, 80),
            ], ['Accept' => 'application/json'])
            ->assertCreated();
    }
}
