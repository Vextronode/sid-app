<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Repositories\LetterRepository;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Support\Carbon;

class DashboardService
{
    private const ALLOWED_VILLAGE_WIDE_ROLES = [
        'kasi_pelayanan',
        'kaur_tu_umum',
        'petugas_desa',
    ];

    private const WEEK_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    public function __construct(
        protected CitizenRepository $citizenRepository,
        protected LetterRepository $letterRepository,
    ) {}

    /**
     * @return array{total: int, laki: int, perempuan: int}
     */
    public function getGenderStats(User $user): array
    {
        [$rtId, $rwId] = $this->resolveScope($user);

        $laki = $this->citizenRepository->countByGender($user->village_id, 'L', $rtId, $rwId);
        $perempuan = $this->citizenRepository->countByGender($user->village_id, 'P', $rtId, $rwId);

        return [
            'total' => $laki + $perempuan,
            'laki' => $laki,
            'perempuan' => $perempuan,
        ];
    }

    /**
     * @return array{chart: array{labels: array<int, string>, values: array<int, int>, maxY: int}}
     */
    public function getLetterStats(User $user, ?string $date, ?string $letterType): array
    {
        [$rtId, $rwId] = $this->resolveScope($user);

        $parsedDate = Carbon::parse($date ?: now()->toDateString());

        if ($rtId !== null) {
            $query = $this->letterRepository->queryByVillageAndRt($user->village_id, $rtId);
        } elseif ($rwId !== null) {
            $query = $this->letterRepository->queryByVillageAndRw($user->village_id, $rwId);
        } else {
            $query = $this->letterRepository->queryByVillage($user->village_id);
        }

        if ($letterType && $letterType !== 'all') {
            $query->where('letter_type_id', $letterType);
        }

        $values = [];
        $startOfWeek = $parsedDate->copy()->startOfWeek(Carbon::MONDAY);

        foreach (self::WEEK_LABELS as $i => $label) {
            $currentDate = $startOfWeek->copy()->addDays($i);
            $values[] = $this->letterRepository->countSubmittedOnDate($query, $currentDate);
        }

        $maxValue = max($values);
        $maxY = max(50, (int) ceil($maxValue / 5) * 5);

        return [
            'chart' => [
                'labels' => self::WEEK_LABELS,
                'values' => $values,
                'maxY' => $maxY,
            ],
        ];
    }

    /**
     * Menentukan cakupan (rt_id / rw_id) berdasarkan role user yang login.
     * Melempar HttpException 403 jika role tidak berwenang atau data official tidak lengkap.
     *
     * @return array{0: int|null, 1: int|null}
     */
    private function resolveScope(User $user): array
    {
        return match ($user->role) {
            'rt' => $this->resolveRtScope($user),
            'rw' => $this->resolveRwScope($user),
            default => in_array($user->role, self::ALLOWED_VILLAGE_WIDE_ROLES, true)
                ? [null, null]
                : throw new HttpException(403, 'Tidak memiliki akses.'),
        };
    }

    /**
     * @return array{0: int, 1: null}
     */
    private function resolveRtScope(User $user): array
    {
        $official = $user->official;

        if (! $official || ! $official->rt_id) {
            throw new HttpException(403, 'Data official RT tidak ditemukan.');
        }

        return [$official->rt_id, null];
    }

    /**
     * @return array{0: null, 1: int}
     */
    private function resolveRwScope(User $user): array
    {
        $official = $user->official;

        if (! $official || ! $official->rw_id) {
            throw new HttpException(403, 'Data official RW tidak ditemukan.');
        }

        return [null, $official->rw_id];
    }
}
