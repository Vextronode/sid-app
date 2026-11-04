<?php

namespace Tests\Feature;

use App\Models\PasswordResetRequest;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

/**
 * Tindakan Staf SIDUTama atas akun (aktif/nonaktif, ubah, reset kata
 * sandi, keputusan permintaan atur ulang) tercatat di Log Aktivitas tanpa
 * kata sandi, dan Log Aktivitas tidak lagi dibersihkan otomatis.
 */
class AccountActivityLogTest extends TestCase
{
    use RefreshDatabase;

    private Village $village;

    private User $staf;

    private User $warga;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        $this->staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);
        $this->warga = User::factory()->create([
            'role' => 'warga',
            'village_id' => $this->village->id,
            'name' => 'Ujang Warga',
            'username' => 'ujang',
        ]);
    }

    public function test_activity_log_is_not_cleaned_on_a_schedule(): void
    {
        $this->artisan('schedule:list')
            ->expectsOutputToContain('approvals:send-reminders')
            ->doesntExpectOutputToContain('activitylog:clean')
            ->assertSuccessful();
    }

    public function test_toggling_an_account_logs_one_entry_per_action(): void
    {
        $this->actingAs($this->staf)->patchJson("/api/users/{$this->warga->id}/toggle-status")->assertOk();
        $this->actingAs($this->staf)->patchJson("/api/users/{$this->warga->id}/toggle-status")->assertOk();

        $logs = Activity::query()->where('log_name', 'user')->orderBy('id')->get();
        $this->assertSame(['deactivated', 'activated'], $logs->pluck('event')->all());
        $this->assertTrue($logs->every(fn (Activity $log) => $log->causer_id === $this->staf->id && $log->subject_id === $this->warga->id));
        $this->assertSame($this->village->id, $logs[0]->properties['village_id']);
        $this->assertSame('Ujang Warga (ujang)', $logs[0]->properties['subject_label']);
        $this->assertSame(['old' => true, 'new' => false], $logs[0]->properties['changes']['is_active']);
    }

    public function test_updating_an_account_logs_the_changed_fields(): void
    {
        $this->actingAs($this->staf)->patchJson("/api/users/{$this->warga->id}", ['name' => 'Ujang Saputra'])->assertOk();
        // Simpan ulang tanpa perubahan: tidak ada entri baru.
        $this->actingAs($this->staf)->patchJson("/api/users/{$this->warga->id}", ['name' => 'Ujang Saputra'])->assertOk();

        $log = Activity::query()->where('log_name', 'user')->sole();
        $this->assertSame('updated', $log->event);
        $this->assertSame(['name' => ['old' => 'Ujang Warga', 'new' => 'Ujang Saputra']], $log->properties['changes']);
    }

    public function test_password_reset_by_staff_is_logged_without_the_password(): void
    {
        $temporaryPassword = $this->actingAs($this->staf)
            ->postJson("/api/users/{$this->warga->id}/reset-password")
            ->assertOk()
            ->json('temporary_password');

        $log = Activity::query()->where('log_name', 'user')->sole();
        $this->assertSame('password_reset_by_staff', $log->event);
        $this->assertSame($this->warga->id, $log->subject_id);
        $this->assertStringNotContainsString($temporaryPassword, $log->getRawOriginal('properties'));
        $this->assertStringNotContainsString('password', strtolower(json_encode($log->properties['changes'])));
    }

    public function test_reset_request_decisions_are_logged(): void
    {
        $approved = $this->resetRequest();
        $this->actingAs($this->staf)->postJson("/api/password-reset-requests/{$approved->id}/approve")->assertOk();

        $rejected = $this->resetRequest();
        $this->actingAs($this->staf)
            ->postJson("/api/password-reset-requests/{$rejected->id}/reject", ['notes' => 'Identitas tidak cocok'])
            ->assertOk();

        $logs = Activity::query()->where('log_name', 'password_reset_request')->orderBy('id')->get();
        $this->assertSame(['approved', 'rejected'], $logs->pluck('event')->all());
        $this->assertSame([$approved->id, $rejected->id], $logs->pluck('subject_id')->map(fn ($id) => (int) $id)->all());
        $this->assertTrue($logs->every(fn (Activity $log) => $log->causer_id === $this->staf->id
            && $log->properties['subject_label'] === 'Ujang Warga (ujang)'
            && $log->properties['village_id'] === $this->village->id));
        $this->assertSame('Identitas tidak cocok', $logs[1]->properties['notes']);
    }

    public function test_account_logs_page_lists_village_entries_with_filters(): void
    {
        $this->actingAs($this->staf)->patchJson("/api/users/{$this->warga->id}/toggle-status")->assertOk();
        $this->actingAs($this->staf)->postJson("/api/users/{$this->warga->id}/reset-password")->assertOk();

        // Desa lain tidak ikut tampil.
        $otherVillage = Village::factory()->create();
        $otherStaf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $otherVillage->id]);
        $otherWarga = User::factory()->create(['role' => 'warga', 'village_id' => $otherVillage->id]);
        $this->actingAs($otherStaf)->patchJson("/api/users/{$otherWarga->id}/toggle-status")->assertOk();

        $this->actingAs($this->staf)
            ->getJson('/api/activity-logs/accounts')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.event', 'password_reset_by_staff')
            ->assertJsonPath('data.0.subject_label', 'Ujang Warga (ujang)')
            ->assertJsonPath('data.0.actor.id', $this->staf->id)
            ->assertJsonPath('data.1.event', 'deactivated')
            ->assertJsonPath('data.1.changes.is_active.new', false);

        $this->actingAs($this->staf)
            ->getJson('/api/activity-logs/accounts?event=deactivated')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($this->warga->fresh())
            ->getJson('/api/activity-logs/accounts')
            ->assertForbidden();
    }

    private function resetRequest(): PasswordResetRequest
    {
        return PasswordResetRequest::query()->create([
            'user_id' => $this->warga->id,
            'claim_token_hash' => PasswordResetRequest::hashToken(bin2hex(random_bytes(16))),
            'status' => PasswordResetRequest::STATUS_PENDING,
        ]);
    }
}
