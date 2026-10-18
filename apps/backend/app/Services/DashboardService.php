<?php

namespace App\Services;

use App\Models\Official;
use App\Models\User;
use App\Repositories\CitizenRepository;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\HttpException;

class DashboardService
{
    public function __construct(
        protected CitizenRepository $citizenRepository,
        protected LetterService $letterService,
    ) {}

    /**
     * @return array{total: int, laki: int, perempuan: int}
     */
    public function getGenderStats(User $user): array
    {
        [$villageId, $rtId, $rwId] = $this->resolveLegacyScope($user);

        $counts = $this->citizenRepository->countGroupedByGender($villageId, $rtId, $rwId);
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

    private function activeOfficial(User $user, string $position): Official
    {
        $official = $user->official()
            ->where('position', $position)
            ->where('is_active', true)
            ->first();

        if (! $official) {
            $positionLabel = match ($position) {
                'rt', 'rw' => strtoupper($position),
                default => $position,
            };

            throw new HttpException(403, "Data official {$positionLabel} tidak ditemukan.");
        }

        if (! $official->village_id) {
            throw new HttpException(403, 'Data desa pejabat tidak ditemukan.');
        }

        return $official;
    }

    /**
     * Scope statistik warga: RT/RW ke wilayahnya, Kasi/Kaur/Petugas ke
     * seluruh desa; role lain (termasuk kadus) ditolak.
     *
     * @return array{0: string, 1: int|null, 2: int|null}
     */
    private function resolveLegacyScope(User $user): array
    {
        $regional = in_array($user->role, ['rt', 'rw'], true)
            ? $this->activeOfficial($user, $user->role)
            : null;

        return match ($user->role) {
            'rt' => [$regional->village_id, $regional->rt_id, null],
            'rw' => [$regional->village_id, null, $regional->rw_id],
            'kasi_pelayanan', 'kaur_tu_umum' => [$this->officialVillageId($user), null, null],
            'staf_sid' => [$this->officialVillageId($user), null, null],
            default => throw new HttpException(403, 'Tidak memiliki akses.'),
        };
    }

    private function officialVillageId(User $user): string
    {
        $official = $user->official()->where('is_active', true)->first();
        if (! $user->is_active || ! $official?->village_id || $official->position !== $user->role) {
            throw new HttpException(403, 'Data desa pejabat tidak valid.');
        }

        return $official->village_id;
    }
}
