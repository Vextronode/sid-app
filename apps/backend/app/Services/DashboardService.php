<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Support\PopulationScope;
use Illuminate\Support\Carbon;

class DashboardService
{
    public function __construct(
        protected CitizenRepository $citizenRepository,
        protected LetterService $letterService,
    ) {}

    /**
     * Warga aktif menurut jenis kelamin, dalam cakupan yang sama dengan
     * Data Penduduk (PopulationScope): Staf, Kasi, Kaur, Kades, dan Sekdes
     * se-desa; Kadus dusunnya; RW dan RT wilayahnya; peran lain 403.
     *
     * @return array{total: int, laki: int, perempuan: int}
     */
    public function getGenderStats(User $user): array
    {
        $counts = $this->citizenRepository->countGroupedByGender(PopulationScope::for($user));
        $laki = $counts['L'] ?? 0;
        $perempuan = $counts['P'] ?? 0;

        return [
            'total' => $laki + $perempuan,
            'laki' => $laki,
            'perempuan' => $perempuan,
        ];
    }

    /**
     * Grafik pengajuan surat per hari dalam satu minggu (Senin-Minggu),
     * memakai scope per role yang sama dengan /letters/summary.
     *
     * @return array{chart: array{labels: array<int, string>, values: array<int, int>, maxY: int}}
     */
    public function getLetterStats(User $user, ?string $date, ?string $letterType): array
    {
        $parsedDate = Carbon::parse($date ?: now()->toDateString());

        $labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
        $startOfWeek = $parsedDate->copy()->startOfWeek(Carbon::MONDAY);
        $perDay = $this->letterService->countSubmittedPerDayForUser(
            $user,
            $startOfWeek,
            $startOfWeek->copy()->addDays(count($labels) - 1),
            $letterType,
        );
        $values = [];

        foreach (array_keys($labels) as $index) {
            $values[] = $perDay[$startOfWeek->copy()->addDays($index)->toDateString()] ?? 0;
        }

        $maxValue = max($values);

        return [
            'chart' => [
                'labels' => $labels,
                'values' => $values,
                'maxY' => max(50, (int) ceil($maxValue / 5) * 5),
            ],
        ];
    }
}
