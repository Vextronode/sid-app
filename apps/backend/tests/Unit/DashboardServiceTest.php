<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Services\DashboardService;
use HttpException;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        );
    }

    public function test_gender_stats_for_petugas_desa_counts_all_citizens_in_village(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        Citizen::factory()->create(['village_id' => $user->village_id, 'gender' => 'L']);
        Citizen::factory()->create(['village_id' => $user->village_id, 'gender' => 'P']);
        Citizen::factory()->create(['village_id' => $user->village_id, 'gender' => 'P']);

        $stats = $this->service->getGenderStats($user);

        $this->assertSame(3, $stats['total']);
        $this->assertSame(1, $stats['laki']);
        $this->assertSame(2, $stats['perempuan']);
    }

    public function test_gender_stats_for_rt_scopes_to_own_rt(): void
    {
        $official = Official::factory()->create(['position' => 'rt']);
        $official->rt_id = $official->citizen->rt_id;
        $official->save();

        $user = User::factory()->create([
            'village_id' => $official->citizen->village_id,
            'role' => 'rt',
        ]);
        $user->official()->save($official);

        Citizen::factory()->create([
            'village_id' => $user->village_id,
            'rt_id' => $official->rt_id,
            'gender' => 'L',
        ]);
        Citizen::factory()->create([
            'village_id' => $user->village_id,
            'rt_id' => $official->rt_id + 999,
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
        $user = User::factory()->create(['role' => 'petugas_desa']);
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
        $user = User::factory()->create(['role' => 'petugas_desa']);
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
}
