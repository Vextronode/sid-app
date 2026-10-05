<?php

namespace Tests\Feature;

use App\Models\ApprovalFlow;
use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Official;
use App\Models\Rt;
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
        $user = $this->makeUserWithOfficialAssignment('petugas_desa', 'petugas_desa', $village->id);
        $user->citizen->update(['gender' => 'L']);
        Citizen::factory()->create(['village_id' => $village->id, 'gender' => 'L']);
        Citizen::factory()->create(['village_id' => $village->id, 'gender' => 'P']);

        $this->actingAs($user)
            ->getJson('/api/dashboard/gender-stats')
            ->assertOk()
            ->assertJson([
                'total' => 3,
                'laki' => 2,
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
        $user = $this->makeUserWithOfficialAssignment('petugas_desa', 'petugas_desa', $village->id);

        $this->actingAs($user)
            ->getJson('/api/dashboard/letter-stats')
            ->assertOk()
            ->assertJsonStructure([
                'chart' => ['labels', 'values', 'maxY'],
            ]);
    }

    public function test_rw_letter_stats_scopes_through_citizens_rt(): void
    {
        $village = Village::factory()->create();
        $rw = Rw::factory()->create(['village_id' => $village->id]);
        $rt = Rt::factory()->create(['village_id' => $village->id, 'rw_id' => $rw->id]);
        $official = Official::factory()->create([
            'position' => 'rw',
            'village_id' => $village->id,
            'rw_id' => $rw->id,
            'is_active' => true,
        ]);
        $user = User::factory()->create(['role' => 'rw', 'village_id' => $village->id]);
        $user->official()->save($official);

        $citizen = Citizen::factory()->create(['village_id' => $village->id, 'rt_id' => $rt->id]);
        Letter::factory()->create([
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
            'submitted_at' => now(),
        ]);

        $response = $this->actingAs($user->fresh())
            ->getJson('/api/dashboard/letter-stats')
            ->assertOk();

        $this->assertSame(1, array_sum($response->json('chart.values')));
    }

    public function test_generic_dashboard_returns_warga_shape(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['role', 'my_letters', 'unread_notifications_count'],
            ])
            ->assertJsonPath('data.role', 'warga');
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
                'data' => ['role', 'fyi_letters', 'unread_notifications_count'],
            ])
            ->assertJsonPath('data.role', 'rw');
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

    public function test_generic_dashboard_includes_petugas_desa_term_summaries(): void
    {
        $village = Village::factory()->create();
        $user = $this->makeUserWithOfficialAssignment('petugas_desa', 'petugas_desa', $village->id);
        $expiredCitizen = Citizen::factory()->create(['village_id' => $village->id, 'name' => 'Pejabat Expired']);
        $endingCitizen = Citizen::factory()->create(['village_id' => $village->id, 'name' => 'Pejabat Akan Berakhir']);
        Official::factory()->create([
            'village_id' => $village->id,
            'citizen_id' => $expiredCitizen->id,
            'position' => 'rt',
            'term_ends_at' => today()->subDay(),
            'is_active' => true,
        ]);
        Official::factory()->create([
            'village_id' => $village->id,
            'citizen_id' => $endingCitizen->id,
            'position' => 'rw',
            'term_ends_at' => today()->addDays(30),
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.jabatan_lewat_masa.0.name', 'Pejabat Expired')
            ->assertJsonPath('data.jabatan_lewat_masa.0.term_ends_at', today()->subDay()->toDateString())
            ->assertJsonPath('data.jabatan_segera_berakhir.0.name', 'Pejabat Akan Berakhir')
            ->assertJsonPath('data.jabatan_segera_berakhir.0.term_ends_at', today()->addDays(30)->toDateString());
    }

    public function test_kades_dashboard_does_not_include_own_pending_letter(): void
    {
        $village = Village::factory()->create();
        $user = User::factory()->create([
            'role' => 'kepala_desa',
            'village_id' => $village->id,
        ]);
        Official::factory()->forUser($user)->position('kepala_desa')->create();
        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 1,
            'approver_position' => 'kepala_desa',
            'is_final' => true,
        ]);
        $ownLetter = Letter::factory()->create([
            'village_id' => $village->id,
            'flow_id' => $flow->id,
            'submitted_by' => $user->id,
            'status' => 'pending',
        ]);
        $otherLetter = Letter::factory()->create([
            'village_id' => $village->id,
            'flow_id' => $flow->id,
            'status' => 'pending',
        ]);

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.pending_letters.0.id', $otherLetter->id)
            ->assertJsonMissing(['id' => $ownLetter->id]);
    }

    public function test_generic_dashboard_returns_completed_letters_for_assigned_kasi_role(): void
    {
        $village = Village::factory()->create();
        $user = $this->makeUserWithOfficialAssignment('kasi_pelayanan', 'kasi_pelayanan', $village->id);
        $letterType = LetterType::factory()->create(['assigned_role' => 'kasi_pelayanan']);
        Letter::factory()->create([
            'village_id' => $village->id,
            'letter_type_id' => $letterType->id,
            'status' => 'approved',
        ]);

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'role',
                    'total_surat_selesai',
                    'completed_letters',
                    'unread_notifications_count',
                ],
            ])
            ->assertJsonPath('data.role', 'kasi_pelayanan')
            ->assertJsonPath('data.total_surat_selesai', 1);
    }
}
