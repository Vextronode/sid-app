<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_gender_stats_returns_counts_for_staf_sid(): void
    {
        $village = Village::factory()->create();
        $user = $this->makeUserWithOfficialAssignment('staf_sid', 'staf_sid', $village->id);
        $user->citizen->update(['gender' => 'L']);
        Citizen::factory()->create(['village_id' => $village->id, 'gender' => 'L']);
        Citizen::factory()->create(['village_id' => $village->id, 'gender' => 'P']);
        Citizen::factory()->create(['village_id' => $village->id, 'gender' => 'P', 'is_active' => false]);

        $this->actingAs($user)
            ->getJson('/api/dashboard/gender-stats')
            ->assertOk()
            ->assertJson(['data' => [
                'total' => 3,
                'laki' => 2,
                'perempuan' => 1,
            ]]);
    }

    public function test_gender_stats_forbidden_for_unauthorized_role(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $this->actingAs($user)
            ->getJson('/api/dashboard/gender-stats')
            ->assertStatus(403)
            ->assertJsonPath('message', 'Tidak memiliki akses.');
    }

    public function test_gender_stats_forbids_kadus(): void
    {
        $user = User::factory()->create(['role' => 'kadus']);

        $this->actingAs($user)
            ->getJson('/api/dashboard/gender-stats')
            ->assertForbidden();
    }

    public function test_letter_stats_returns_chart_structure(): void
    {
        $village = Village::factory()->create();
        $user = $this->makeUserWithOfficialAssignment('staf_sid', 'staf_sid', $village->id);

        $this->actingAs($user)
            ->getJson('/api/dashboard/letter-stats')
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['chart' => ['labels', 'values', 'maxY']],
            ]);
    }

    public function test_letter_stats_rejects_invalid_date(): void
    {
        $user = User::factory()->create(['role' => 'staf_sid']);

        $this->actingAs($user)
            ->getJson('/api/dashboard/letter-stats?date=not-a-date')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['date']);
    }

    public function test_rw_letter_stats_counts_only_rt_approved_letters_in_own_rw(): void
    {
        $village = Village::factory()->create();
        $rw = Rw::factory()->create(['village_id' => $village->id]);
        $rt = Rt::factory()->create(['village_id' => $village->id, 'rw_id' => $rw->id]);
        $user = $this->makeUserWithOfficialAssignment('rw', 'rw', $village->id, ['rw_id' => $rw->id]);

        $citizen = Citizen::factory()->create(['village_id' => $village->id, 'rt_id' => $rt->id]);
        $approved = Letter::factory()->create(['village_id' => $village->id, 'citizen_id' => $citizen->id]);
        $this->approveAtRt($approved);
        // Belum disetujui RT: belum terlihat oleh RW, jadi tidak dihitung.
        Letter::factory()->create(['village_id' => $village->id, 'citizen_id' => $citizen->id]);

        $this->assertSame(1, $this->letterStatsTotal($user));
    }

    public function test_kadus_letter_stats_counts_rt_approved_letters_in_own_hamlet(): void
    {
        $village = Village::factory()->create();
        $hamlet = Hamlet::factory()->create(['village_id' => $village->id]);
        $otherHamlet = Hamlet::factory()->create(['village_id' => $village->id]);
        $user = $this->makeUserWithOfficialAssignment('kadus', 'kadus', $village->id, ['hamlet_id' => $hamlet->id]);

        $ownCitizen = Citizen::factory()->create(['village_id' => $village->id, 'hamlet_id' => $hamlet->id]);
        $otherCitizen = Citizen::factory()->create(['village_id' => $village->id, 'hamlet_id' => $otherHamlet->id]);
        $ownApproved = Letter::factory()->create(['village_id' => $village->id, 'citizen_id' => $ownCitizen->id]);
        $otherApproved = Letter::factory()->create(['village_id' => $village->id, 'citizen_id' => $otherCitizen->id]);
        $this->approveAtRt($ownApproved);
        $this->approveAtRt($otherApproved);
        Letter::factory()->create(['village_id' => $village->id, 'citizen_id' => $ownCitizen->id]);

        $this->assertSame(1, $this->letterStatsTotal($user));
    }

    public function test_kepala_desa_letter_stats_counts_rt_approved_letters_in_village(): void
    {
        $village = Village::factory()->create();
        $user = $this->makeUserWithOfficialAssignment('kepala_desa', 'kepala_desa', $village->id);

        $this->approveAtRt(Letter::factory()->create(['village_id' => $village->id]));
        Letter::factory()->create(['village_id' => $village->id]);

        $this->assertSame(1, $this->letterStatsTotal($user));
    }

    public function test_kasi_letter_stats_counts_only_assigned_approved_letters(): void
    {
        $village = Village::factory()->create();
        $user = $this->makeUserWithOfficialAssignment('kasi_pemerintahan', 'kasi_pemerintahan', $village->id);
        $kasiType = LetterType::factory()->create(['assigned_role' => 'kasi_pemerintahan']);
        $kaurType = LetterType::factory()->create(['assigned_role' => 'kaur_tu_umum']);

        Letter::factory()->create(['village_id' => $village->id, 'letter_type_id' => $kasiType->id, 'status' => 'approved']);
        Letter::factory()->create(['village_id' => $village->id, 'letter_type_id' => $kasiType->id, 'status' => 'pending']);
        Letter::factory()->create(['village_id' => $village->id, 'letter_type_id' => $kaurType->id, 'status' => 'approved']);

        $this->assertSame(1, $this->letterStatsTotal($user));
    }

    public function test_letter_stats_filters_by_letter_type(): void
    {
        $village = Village::factory()->create();
        $user = $this->makeUserWithOfficialAssignment('staf_sid', 'staf_sid', $village->id);
        $letter = Letter::factory()->create(['village_id' => $village->id]);
        Letter::factory()->create(['village_id' => $village->id]);

        $this->assertSame(2, $this->letterStatsTotal($user, 'all'));
        $this->assertSame(1, $this->letterStatsTotal($user, (string) $letter->letter_type_id));
    }

    private function approveAtRt(Letter $letter): void
    {
        $letter->approvals()->create([
            'approved_by' => User::factory()->create(['village_id' => $letter->village_id])->id,
            'approval_level' => 'rt',
            'action' => 'approved',
        ]);
    }

    private function letterStatsTotal(User $user, ?string $letterType = null): int
    {
        $response = $this->actingAs($user)
            ->getJson('/api/dashboard/letter-stats'.($letterType ? "?letter_type={$letterType}" : ''))
            ->assertOk();

        return array_sum($response->json('data.chart.values'));
    }
}
