<?php

namespace Tests\Unit;

use App\Models\ApprovalFlow;
use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Official;
use App\Models\Rt;
use App\Models\User;
use App\Models\Village;
use App\Repositories\CitizenRepository;
use App\Repositories\LetterRepository;
use App\Repositories\NotificationRepository;
use App\Repositories\OfficialRepository;
use App\Services\DashboardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class DashboardServiceTest extends TestCase
{
    use RefreshDatabase;

    private DashboardService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new DashboardService(
            new CitizenRepository,
            new LetterRepository,
            new NotificationRepository,
            new OfficialRepository,
        );
    }

    public function test_gender_stats_for_petugas_desa_counts_all_citizens_in_village(): void
    {
        $village = Village::factory()->create();
        $user = $this->makeUserWithOfficialAssignment('petugas_desa', 'petugas_desa', $village->id);
        $user->citizen->update(['gender' => 'L']);
        Citizen::factory()->create(['village_id' => $village->id, 'gender' => 'L']);
        Citizen::factory()->create(['village_id' => $village->id, 'gender' => 'P']);
        Citizen::factory()->create(['village_id' => $village->id, 'gender' => 'P']);

        $stats = $this->service->getGenderStats($user);

        $this->assertSame(4, $stats['total']);
        $this->assertSame(2, $stats['laki']);
        $this->assertSame(2, $stats['perempuan']);
    }

    public function test_gender_stats_for_rt_scopes_to_own_rt(): void
    {
        $ownRt = Rt::factory()->create();
        $otherRt = Rt::factory()->create();

        $official = Official::factory()->create([
            'position' => 'rt',
            'rt_id' => $ownRt->id,
        ]);
        $official->citizen->update(['rt_id' => $otherRt->id]);

        $user = User::factory()->create([
            'village_id' => $official->citizen->village_id,
            'role' => 'rt',
        ]);
        $user->official()->save($official);

        Citizen::factory()->create([
            'village_id' => $user->village_id,
            'rt_id' => $ownRt->id,
            'gender' => 'L',
        ]);
        Citizen::factory()->create([
            'village_id' => $user->village_id,
            'rt_id' => $otherRt->id,
            'gender' => 'L',
        ]);

        $stats = $this->service->getGenderStats($user);

        $this->assertSame(1, $stats['total']);
    }

    public function test_gender_stats_for_rt_without_official_data_throws_403(): void
    {
        $user = User::factory()->create(['role' => 'rt']);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Data official RT tidak ditemukan.');

        $this->service->getGenderStats($user);
    }

    public function test_gender_stats_for_unauthorized_role_throws_403(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Tidak memiliki akses.');

        $this->service->getGenderStats($user);
    }

    public function test_letter_stats_returns_chart_with_seven_days_and_min_max_y_of_50(): void
    {
        $village = Village::factory()->create();
        $user = $this->makeUserWithOfficialAssignment('petugas_desa', 'petugas_desa', $village->id);
        Letter::factory()->create([
            'village_id' => $user->village_id,
            'submitted_at' => now(),
        ]);

        $stats = $this->service->getLetterStats($user, null, null);

        $this->assertCount(7, $stats['chart']['labels']);
        $this->assertCount(7, $stats['chart']['values']);
        $this->assertGreaterThanOrEqual(50, $stats['chart']['maxY']);
        $this->assertSame(['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'], $stats['chart']['labels']);
    }

    public function test_letter_stats_filters_by_letter_type_when_given(): void
    {
        $village = Village::factory()->create();
        $user = $this->makeUserWithOfficialAssignment('petugas_desa', 'petugas_desa', $village->id);
        $letter = Letter::factory()->create([
            'village_id' => $user->village_id,
            'submitted_at' => now(),
        ]);

        $stats = $this->service->getLetterStats($user, null, (string) $letter->letter_type_id);

        $total = array_sum($stats['chart']['values']);
        $this->assertSame(1, $total);
    }

    public function test_letter_stats_for_unauthorized_role_throws_403(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $this->expectException(HttpException::class);

        $this->service->getLetterStats($user, null, null);
    }

    public function test_kasi_dashboard_shows_only_matching_approved_letters_with_total_and_limit(): void
    {
        $village = Village::factory()->create();
        $user = $this->makeUserWithOfficialAssignment('kasi_pelayanan', 'kasi_pelayanan', $village->id);
        $kasiType = LetterType::factory()->create(['assigned_role' => 'kasi_pelayanan']);
        $unassignedType = LetterType::factory()->create(['assigned_role' => null]);
        $kaurType = LetterType::factory()->create(['assigned_role' => 'kaur_tu_umum']);

        Letter::factory()->count(21)->create([
            'village_id' => $village->id,
            'letter_type_id' => $kasiType->id,
            'status' => 'approved',
        ]);
        Letter::factory()->create([
            'village_id' => $village->id,
            'letter_type_id' => $unassignedType->id,
            'status' => 'approved',
        ]);
        $excluded = Letter::factory()->create([
            'village_id' => $village->id,
            'letter_type_id' => $kaurType->id,
            'status' => 'approved',
        ]);
        Letter::factory()->create([
            'village_id' => $village->id,
            'letter_type_id' => $kasiType->id,
            'status' => 'pending',
        ]);

        $dashboard = $this->service->getDashboard($user);

        $this->assertSame('kasi_pelayanan', $dashboard['role']);
        $this->assertSame(22, $dashboard['total_surat_selesai']);
        $this->assertCount(20, $dashboard['completed_letters']);
        $this->assertNotContains(
            $excluded->id,
            array_column($dashboard['completed_letters'], 'id'),
        );
    }

    public function test_petugas_dashboard_includes_expired_and_ending_official_terms(): void
    {
        $village = Village::factory()->create();
        $user = $this->makeUserWithOfficialAssignment('petugas_desa', 'petugas_desa', $village->id);
        $expiredCitizen = Citizen::factory()->create([
            'village_id' => $village->id,
            'name' => 'Pejabat Lewat Masa',
        ]);
        $endingCitizen = Citizen::factory()->create([
            'village_id' => $village->id,
            'name' => 'Pejabat Segera Berakhir',
        ]);
        Official::factory()->create([
            'position' => 'rt',
            'village_id' => $village->id,
            'citizen_id' => $expiredCitizen->id,
            'term_ends_at' => today()->subDay(),
            'is_active' => true,
        ]);
        Official::factory()->create([
            'position' => 'rw',
            'village_id' => $village->id,
            'citizen_id' => $endingCitizen->id,
            'term_ends_at' => today()->addDays(30),
            'is_active' => true,
        ]);

        $dashboard = $this->service->getDashboard($user);

        $this->assertSame('Pejabat Lewat Masa', $dashboard['jabatan_lewat_masa'][0]['name']);
        $this->assertSame(today()->subDay()->toDateString(), $dashboard['jabatan_lewat_masa'][0]['term_ends_at']);
        $this->assertSame('Pejabat Segera Berakhir', $dashboard['jabatan_segera_berakhir'][0]['name']);
        $this->assertSame(today()->addDays(30)->toDateString(), $dashboard['jabatan_segera_berakhir'][0]['term_ends_at']);
    }

    public function test_kades_dashboard_excludes_letters_submitted_by_user_or_for_own_citizen(): void
    {
        $village = Village::factory()->create();
        $user = User::factory()->create([
            'role' => 'kepala_desa',
            'village_id' => $village->id,
        ]);
        $official = Official::factory()->forUser($user)->position('kepala_desa')->create();

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
        $citizenLetter = Letter::factory()->create([
            'village_id' => $village->id,
            'flow_id' => $flow->id,
            'citizen_id' => $official->citizen_id,
            'status' => 'pending',
        ]);

        $dashboard = $this->service->getDashboard($user);

        $this->assertSame([$otherLetter->id], array_column($dashboard['pending_letters'], 'id'));
        $this->assertNotContains($ownLetter->id, array_column($dashboard['pending_letters'], 'id'));
        $this->assertNotContains($citizenLetter->id, array_column($dashboard['pending_letters'], 'id'));
    }

    public function test_kades_dashboard_excludes_letter_submitted_for_the_officials_citizen(): void
    {
        $village = Village::factory()->create();
        $user = User::factory()->create([
            'role' => 'kepala_desa',
            'village_id' => $village->id,
        ]);
        $official = Official::factory()->forUser($user)->position('kepala_desa')->create();

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 1,
            'approver_position' => 'kepala_desa',
            'is_final' => true,
        ]);
        $letter = Letter::factory()->create([
            'village_id' => $village->id,
            'flow_id' => $flow->id,
            'citizen_id' => $official->citizen_id,
            'status' => 'pending',
        ]);

        $dashboard = $this->service->getDashboard($user);

        $this->assertSame(0, $dashboard['total_menunggu_approval']);
        $this->assertNotContains($letter->id, array_column($dashboard['pending_letters'], 'id'));
    }
}
