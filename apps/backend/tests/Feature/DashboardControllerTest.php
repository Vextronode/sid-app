<?php

namespace Tests\Feature;

use App\Models\Citizen;
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
}
