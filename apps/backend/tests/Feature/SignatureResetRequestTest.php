<?php

namespace Tests\Feature;

use App\Models\SignatureResetRequest;
use App\Models\User;
use App\Models\UserSignature;
use App\Models\Village;
use App\Notifications\SignatureResetNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

class SignatureResetRequestTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private User $warga;

    private User $petugas;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');

        $this->village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($this->village);
        $this->warga = $this->makeCitizenAccount($this->village, $rt)['user'];
        $this->petugas = $this->makeOfficialUser('staf_sid', $this->village)['user'];
    }

    public function test_owner_submits_once_and_staf_sid_of_the_village_is_notified(): void
    {
        // Tanpa TTD tidak ada yang perlu direset.
        $this->actingAs($this->warga)
            ->postJson('/api/profile/signature/reset-request', ['reason' => 'Tanda tangan salah'])
            ->assertStatus(409);

        $this->giveSignature($this->warga);

        $this->actingAs($this->warga)
            ->postJson('/api/profile/signature/reset-request', ['reason' => 'abc'])
            ->assertStatus(422);
        $this->actingAs($this->warga)
            ->postJson('/api/profile/signature/reset-request', ['reason' => 'Tanda tangan salah'])
            ->assertCreated();
        $this->actingAs($this->warga)
            ->postJson('/api/profile/signature/reset-request', ['reason' => 'Tanda tangan salah'])
            ->assertStatus(409);

        $this->assertSame(1, SignatureResetRequest::query()->count());
        $this->actingAs($this->warga)->getJson('/api/profile/signature')
            ->assertOk()
            ->assertJsonPath('data.has_signature', true)
            ->assertJsonPath('data.reset_request.id', SignatureResetRequest::query()->value('id'));

        Notification::assertSentTo(
            $this->petugas,
            SignatureResetNotification::class,
            fn ($notification) => $notification->toArray($this->petugas)['context']['status'] === 'signature_reset_requested',
        );
    }

    public function test_staf_sid_cannot_submit_for_own_signature(): void
    {
        $this->giveSignature($this->petugas);

        $this->actingAs($this->petugas)
            ->postJson('/api/profile/signature/reset-request', ['reason' => 'Tanda tangan salah'])
            ->assertForbidden();
    }

    public function test_approving_resets_the_signature_and_empties_the_queue(): void
    {
        $request = $this->submitRequest();
        $foreignPetugas = $this->makeOfficialUser('staf_sid', Village::factory()->create())['user'];

        $this->actingAs($this->warga)
            ->getJson('/api/signature-reset-requests')
            ->assertForbidden();
        $this->actingAs($foreignPetugas)
            ->getJson('/api/signature-reset-requests')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->actingAs($foreignPetugas)
            ->postJson("/api/signature-reset-requests/{$request->id}/approve")
            ->assertForbidden();

        $this->actingAs($this->petugas)
            ->getJson('/api/signature-reset-requests')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user.name', $this->warga->name);

        $this->actingAs($this->petugas)
            ->postJson("/api/signature-reset-requests/{$request->id}/approve")
            ->assertOk();

        $this->assertSame(SignatureResetRequest::STATUS_APPROVED, $request->refresh()->status);
        $this->assertSame($this->petugas->id, $request->handled_by);
        $this->assertNotNull(UserSignature::query()->where('user_id', $this->warga->id)->value('revoked_at'));
        // Tetap tampil sebagai riwayat beserta pemrosesnya.
        $this->actingAs($this->petugas)
            ->getJson('/api/signature-reset-requests')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', SignatureResetRequest::STATUS_APPROVED)
            ->assertJsonPath('data.0.handler.name', $this->petugas->name);
        $this->actingAs($this->petugas)
            ->postJson("/api/signature-reset-requests/{$request->id}/approve")
            ->assertStatus(409);

        Notification::assertSentTo(
            $this->warga,
            SignatureResetNotification::class,
            fn ($notification) => $notification->toArray($this->warga)['context']['status'] === 'signature_reset_approved',
        );

        // Pemilik akun dapat mengisi tanda tangan baru.
        $this->giveSignature($this->warga);
    }

    public function test_rejecting_keeps_the_signature(): void
    {
        $request = $this->submitRequest();

        $this->actingAs($this->petugas)
            ->postJson("/api/signature-reset-requests/{$request->id}/reject", ['notes' => 'Alasan kurang jelas'])
            ->assertOk();

        $this->assertSame(SignatureResetRequest::STATUS_REJECTED, $request->refresh()->status);
        $this->assertSame('Alasan kurang jelas', $request->response_notes);
        $this->assertNull(UserSignature::query()->where('user_id', $this->warga->id)->value('revoked_at'));

        Notification::assertSentTo(
            $this->warga,
            SignatureResetNotification::class,
            fn ($notification) => $notification->toArray($this->warga)['context']['status'] === 'signature_reset_rejected',
        );

        // Setelah ditolak boleh mengajukan lagi; yang pending tampil di atas riwayat.
        $this->actingAs($this->warga)
            ->postJson('/api/profile/signature/reset-request', ['reason' => 'Tanda tangan salah'])
            ->assertCreated();
        $this->actingAs($this->petugas)
            ->getJson('/api/signature-reset-requests')
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.status', SignatureResetRequest::STATUS_PENDING)
            ->assertJsonPath('data.1.status', SignatureResetRequest::STATUS_REJECTED)
            ->assertJsonPath('data.1.response_notes', 'Alasan kurang jelas')
            ->assertJsonPath('meta.total', 2);
    }

    public function test_direct_reset_from_user_management_closes_pending_request(): void
    {
        $request = $this->submitRequest();

        $this->actingAs($this->petugas)
            ->postJson("/api/users/{$this->warga->id}/signature/reset", ['reason' => 'Salah unggah gambar'])
            ->assertOk();

        $this->assertSame(SignatureResetRequest::STATUS_APPROVED, $request->refresh()->status);
        $this->actingAs($this->petugas)
            ->getJson('/api/signature-reset-requests')
            ->assertJsonPath('data.0.status', SignatureResetRequest::STATUS_APPROVED);
    }

    private function submitRequest(): SignatureResetRequest
    {
        $this->giveSignature($this->warga);

        $this->actingAs($this->warga)
            ->postJson('/api/profile/signature/reset-request', ['reason' => 'Tanda tangan salah'])
            ->assertCreated();

        return SignatureResetRequest::query()->latest('id')->firstOrFail();
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
