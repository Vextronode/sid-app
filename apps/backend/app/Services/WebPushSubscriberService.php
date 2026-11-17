<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use App\Repositories\PushSubscriptionRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Menu Pelanggan Notifikasi (Staf SIDUTama): daftar akun satu desa yang
 * mengaktifkan Web Push beserta status perangkatnya. Hanya baca.
 */
class WebPushSubscriberService
{
    public const PER_PAGE = 20;

    public function __construct(
        private readonly PushSubscriptionRepository $pushSubscriptionRepository,
    ) {}

    public function paginate(User $user, array $filters): LengthAwarePaginator
    {
        return $this->pushSubscriptionRepository->paginateSubscribers(
            $this->villageId($user),
            $filters,
            (int) ($filters['per_page'] ?? self::PER_PAGE),
        );
    }

    public function summary(User $user): array
    {
        return $this->pushSubscriptionRepository->summary($this->villageId($user));
    }

    private function villageId(User $user): string
    {
        if ($user->role !== UserRole::StafSid->value || ! $user->is_active || ! $user->village_id) {
            abort(403, UserRole::stafSidLabel().' aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
