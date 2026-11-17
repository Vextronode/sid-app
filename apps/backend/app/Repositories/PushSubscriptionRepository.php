<?php

namespace App\Repositories;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query menu Pelanggan Notifikasi: akun satu desa yang punya minimal satu
 * langganan Web Push, beserta perangkatnya.
 */
class PushSubscriptionRepository
{
    /**
     * @param  array{search?: ?string, role?: ?string, hamlet_id?: int|string|null, rw_id?: int|string|null, rt_id?: int|string|null, push_service?: ?string, status?: ?string}  $filters
     */
    public function paginateSubscribers(string $villageId, array $filters, int $perPage): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $deviceFilter = function (Builder $query) use ($filters): void {
            $query
                ->when($filters['push_service'] ?? null, fn (Builder $q, string $service) => $q->withPushService($service))
                ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->withStatus($status));
        };

        return User::query()
            ->where('village_id', $villageId)
            ->whereHas('pushSubscriptions', $deviceFilter)
            ->when($search !== '', function (Builder $query) use ($search) {
                // NIK terenkripsi: 16 digit dicocokkan lewat nik_hash.
                if (preg_match('/^\d{16}$/', $search)) {
                    return $query->whereHas('citizen', fn (Builder $citizen) => $citizen->where('nik_hash', hash('sha256', $search)));
                }

                $like = '%'.addcslashes(mb_strtolower($search), '\\%_').'%';

                return $query->where(fn (Builder $q) => $q
                    ->whereRaw('LOWER(name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(username) LIKE ?', [$like]));
            })
            ->when($filters['role'] ?? null, fn (Builder $query, string $role) => $query->where('role', $role))
            ->when(! empty($filters['hamlet_id']), fn (Builder $query) => $query->whereHas(
                'citizen.rt.rw',
                fn (Builder $rw) => $rw->where('hamlet_id', $filters['hamlet_id']),
            ))
            ->when(! empty($filters['rw_id']), fn (Builder $query) => $query->whereHas(
                'citizen.rt',
                fn (Builder $rt) => $rt->where('rw_id', $filters['rw_id']),
            ))
            ->when(! empty($filters['rt_id']), fn (Builder $query) => $query->whereHas(
                'citizen',
                fn (Builder $citizen) => $citizen->where('rt_id', $filters['rt_id']),
            ))
            ->with([
                'citizen.rt',
                'citizen.rw.hamlet',
                'pushSubscriptions' => fn ($query) => $query->latest()->orderByDesc('id'),
            ])
            ->withCount('pushSubscriptions')
            ->orderBy('name')
            ->orderBy('id')
            ->paginate($perPage);
    }

    /**
     * Ringkasan satu desa (tidak terpengaruh filter tabel).
     *
     * @return array{subscribed_accounts: int, devices: int, active_accounts: int, devices_by_status: array<string, int>}
     */
    public function summary(string $villageId): array
    {
        $devices = fn () => PushSubscription::query()
            ->where('subscribable_type', (new User)->getMorphClass())
            ->whereIn('subscribable_id', User::query()->select('id')->where('village_id', $villageId));

        $devicesByStatus = [];

        foreach (PushSubscription::STATUSES as $status) {
            $devicesByStatus[$status] = $devices()->withStatus($status)->count();
        }

        return [
            'subscribed_accounts' => User::query()->where('village_id', $villageId)->whereHas('pushSubscriptions')->count(),
            'devices' => $devices()->count(),
            'active_accounts' => User::query()->where('village_id', $villageId)->where('is_active', true)->count(),
            'devices_by_status' => $devicesByStatus,
        ];
    }
}
