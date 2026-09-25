<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Official;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_gender_stats_returns_counts_for_petugas_desa(): void
    {
        $village = Village::factory()->create();
        $user = User::factory()->create(['role' => 'petugas_desa', 'village_id' => $village->id]);
        Citizen::factory()->create(['village_id' => $village->id, 'gender' => 'L']);
        Citizen::factory()->create(['village_id' => $village->id, 'gender' => 'P']);

        $this->actingAs($user)
            ->getJson('/api/dashboard/gender-stats')
            ->assertOk()
            ->assertJson([
                'total' => 2,
                'laki' => 1,
                'perempuan' => 1,
            ]);
    }

    public function test_gender_stats_forbidden_for_unauthorized_role(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $this->actingAs($user)
            ->getJson('/api/dashboard/gender-stats')
            ->assertStatus(403)
            ->assertJsonPath('message', 'Tidak memiliki akses.');
    }

    public function test_letter_stats_returns_chart_structure(): void
    {
        $village = Village::factory()->create();
        $user = User::factory()->create(['role' => 'petugas_desa', 'village_id' => $village->id]);

        $this->actingAs($user)
            ->getJson('/api/dashboard/letter-stats')
            ->assertOk()
            ->assertJsonStructure([
                'chart' => ['labels', 'values', 'maxY'],
            ]);
    }

    public function test_generic_dashboard_returns_warga_shape(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'role',
                'my_letters',
                'unread_notifications_count',
            ])
            ->assertJsonPath('role', 'warga');
    }

    public function test_generic_dashboard_returns_rw_fyi_shape(): void
    {
        $rw = Rw::factory()->create();
        $official = Official::factory()->create([
            'position' => 'rw',
            'rw_id' => $rw->id,
            'is_active' => true,
        ]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'role',
                'fyi_letters',
                'unread_notifications_count',
            ])
            ->assertJsonPath('role', 'rw');
    }

    public function test_generic_dashboard_forbids_kadus(): void
    {
        $user = User::factory()->create(['role' => 'kadus']);

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertForbidden();
    }

    public function test_letter_stats_rejects_invalid_date(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);

        $this->actingAs($user)
            ->getJson('/api/dashboard/letter-stats?date=not-a-date')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['date']);
    }
}
