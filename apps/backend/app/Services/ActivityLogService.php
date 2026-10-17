<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use App\Repositories\ActivityLogRepository;
use App\Repositories\LetterStatusLogRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Halaman Log Aktivitas Petugas Desa: riwayat data warga & KK (S-05)
 * dan riwayat status surat (letter_status_logs). Hanya baca.
 */
class ActivityLogService
{
    public const PER_PAGE = 20;

    public function __construct(
        private readonly ActivityLogRepository $activityLogRepository,
        private readonly LetterStatusLogRepository $letterStatusLogRepository,
    ) {}

    public function population(User $user, array $filters): LengthAwarePaginator
    {
        return $this->activityLogRepository->paginatePopulation($this->villageId($user), $filters, self::PER_PAGE);
    }

    public function letters(User $user, array $filters): LengthAwarePaginator
    {
        return $this->letterStatusLogRepository->paginateForVillage($this->villageId($user), $filters, self::PER_PAGE);
    }

    private function villageId(User $user): string
    {
        if ($user->role !== 'staf_sid' || ! $user->is_active || ! $user->village_id) {
            abort(403, UserRole::stafSidLabel().' aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
