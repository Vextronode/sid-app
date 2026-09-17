<?php

namespace Tests\Feature;

use App\Models\ApprovalSetting;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-9-S2 — Feature test untuk GET /approval-settings dan
 * PATCH /approval-settings/{id}.
 *
 * Cakupan kondisi:
 *  - Seluruh endpoint butuh login (401 untuk guest).
 *  - Seluruh endpoint ditolak (403) untuk role selain petugas_desa.
 *  - GET mengembalikan seluruh setting milik desa user yang login.
 *  - PATCH sukses mengubah deadline_hours/reminder_hours.
 *  - PATCH gagal validasi (422) jika deadline_hours <= 0.
 *  - PATCH gagal validasi (422) jika reminder_hours >= deadline_hours.
 */
class ApprovalSettingEndpointTest extends TestCase
{
    use RefreshDatabase;

    private function petugasDesa(): array
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);

        $user = User::factory()->create([
            'village_id' => $village->id,
            'role' => 'petugas_desa',
        ]);

        return [$village, $user];
    }

    #[Test]
    public function guest_cannot_list_approval_settings(): void
    {
        $response = $this->getJson('/api/approval-settings');

        $response->assertStatus(401);
    }

    #[Test]
    public function non_petugas_desa_cannot_list_or_update_approval_settings(): void
    {
        [$village] = $this->petugasDesa();
        $setting = ApprovalSetting::create([
            'village_id' => $village->id,
            'approval_level' => 'rt',
            'deadline_hours' => 24,
            'reminder_hours' => 12,
        ]);
        $user = User::factory()->create(['village_id' => $village->id, 'role' => 'warga']);

        $this->actingAs($user)
            ->getJson('/api/approval-settings')
            ->assertStatus(403);

        $this->actingAs($user)
            ->patchJson("/api/approval-settings/{$setting->id}", ['deadline_hours' => 48, 'reminder_hours' => 24])
            ->assertStatus(403);
    }

    #[Test]
    public function petugas_desa_can_list_approval_settings(): void
    {
        [$village, $user] = $this->petugasDesa();

        ApprovalSetting::create([
            'village_id' => $village->id,
            'approval_level' => 'rt',
            'deadline_hours' => 24,
            'reminder_hours' => 12,
        ]);
        ApprovalSetting::create([
            'village_id' => $village->id,
            'approval_level' => 'kasi_pelayanan',
            'deadline_hours' => 48,
            'reminder_hours' => 24,
        ]);

        $response = $this->actingAs($user)->getJson('/api/approval-settings');

        $response->assertOk()->assertJsonCount(2, 'data');
    }

    #[Test]
    public function petugas_desa_can_update_approval_setting(): void
    {
        [$village, $user] = $this->petugasDesa();

        $setting = ApprovalSetting::create([
            'village_id' => $village->id,
            'approval_level' => 'rt',
            'deadline_hours' => 24,
            'reminder_hours' => 12,
        ]);

        $response = $this->actingAs($user)->patchJson("/api/approval-settings/{$setting->id}", [
            'deadline_hours' => 48,
            'reminder_hours' => 24,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.deadline_hours', 48)
            ->assertJsonPath('data.reminder_hours', 24);
    }

    #[Test]
    public function update_fails_validation_when_deadline_hours_is_not_positive(): void
    {
        [$village, $user] = $this->petugasDesa();

        $setting = ApprovalSetting::create([
            'village_id' => $village->id,
            'approval_level' => 'rt',
            'deadline_hours' => 24,
            'reminder_hours' => 12,
        ]);

        $response = $this->actingAs($user)->patchJson("/api/approval-settings/{$setting->id}", [
            'deadline_hours' => 0,
            'reminder_hours' => 0,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['deadline_hours']);
    }

    #[Test]
    public function update_fails_validation_when_reminder_hours_is_not_less_than_deadline_hours(): void
    {
        [$village, $user] = $this->petugasDesa();

        $setting = ApprovalSetting::create([
            'village_id' => $village->id,
            'approval_level' => 'rt',
            'deadline_hours' => 24,
            'reminder_hours' => 12,
        ]);

        $response = $this->actingAs($user)->patchJson("/api/approval-settings/{$setting->id}", [
            'deadline_hours' => 24,
            'reminder_hours' => 24,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['reminder_hours']);
    }
}
