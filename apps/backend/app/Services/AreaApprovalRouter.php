<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Citizen;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * D1/K4. Permintaan akun warga yang diputuskan petugas wilayah (aktivasi
 * akun, ganti foto profil). Pemegangnya ditentukan SAAT INI: RT wilayah
 * warga, lalu RW, Kepala Dusun, atau Staf SIDUTama bila jenjang di bawahnya
 * kosong. Bila susunan pejabat berubah, permintaan yang menunggu ikut
 * berpindah; yang sudah diputuskan tetap tercatat atas jenjang yang
 * memutuskan.
 *
 * Model permintaan wajib punya kolom village_id, rt_id, rw_id, hamlet_id,
 * status, dan decided_level.
 */
class AreaApprovalRouter
{
    public const STATUS_PENDING = 'pending';

    /** Jenjang petugas pemegang permintaan, dari yang terendah. */
    public const LEVEL_RT = 'rt';

    public const LEVEL_RW = 'rw';

    public const LEVEL_KADUS = 'kadus';

    public const LEVEL_STAF_SID = 'staf_sid';

    /**
     * Wilayah warga saat mengajukan: dasar routing dan riwayat per jenjang.
     *
     * @return array{rt_id: ?int, rw_id: ?int, hamlet_id: ?int}
     */
    public function areaOf(?Citizen $citizen): array
    {
        $citizen?->loadMissing('rt.rw');
        $rw = $citizen?->rt?->rw;

        return [
            'rt_id' => $citizen?->rt_id,
            'rw_id' => $rw?->id,
            'hamlet_id' => $rw?->hamlet_id ?? $citizen?->hamlet_id,
        ];
    }

    /**
     * Jenjang dan akun pejabat yang saat ini memegang permintaan.
     *
     * @return array{level: string, users: Collection<int, User>}
     */
    public function route(Model $request): array
    {
        $chain = [
            [self::LEVEL_RT, 'rt_id'],
            [self::LEVEL_RW, 'rw_id'],
            [self::LEVEL_KADUS, 'hamlet_id'],
        ];

        foreach ($chain as [$level, $column]) {
            $areaId = $request->getAttribute($column);
            $users = $areaId === null ? new Collection : $this->officialUsers($level, $column, (int) $areaId);

            if ($users->isNotEmpty()) {
                return ['level' => $level, 'users' => $users];
            }
        }

        return [
            'level' => self::LEVEL_STAF_SID,
            'users' => User::query()
                ->where('role', UserRole::StafSid->value)
                ->where('village_id', $request->getAttribute('village_id'))
                ->where('is_active', true)
                ->get(),
        ];
    }

    public function canDecide(User $viewer, Model $request): bool
    {
        return $request->getAttribute('status') === self::STATUS_PENDING
            && $viewer->village_id === $request->getAttribute('village_id')
            && $this->route($request)['users']->contains('id', $viewer->id);
    }

    /**
     * Petugas melihat yang masuk ke jenjang dan wilayahnya sendiri; Staf
     * SIDUTama juga melihat semua yang sudah diputuskan di desanya (riwayat).
     */
    public function canView(User $viewer, Model $request): bool
    {
        if ($request->getAttribute('status') === self::STATUS_PENDING) {
            return $this->canDecide($viewer, $request);
        }

        $scope = $this->scope($viewer);

        if ($scope === null || $viewer->village_id !== $request->getAttribute('village_id')) {
            return false;
        }

        return $scope['level'] === self::LEVEL_STAF_SID
            || ($request->getAttribute('decided_level') === $scope['level'] && (int) $request->getAttribute($scope['column']) === $scope['area']);
    }

    /**
     * Daftar untuk petugas: yang menunggu dan sedang menjadi wewenangnya,
     * lalu riwayat yang terlihat olehnya (canView). Menunggu tampil lebih dulu.
     *
     * @param  Builder<Model>  $query  Query model permintaan beserta eager load.
     * @param  array{status?: string|null, per_page?: int|null}  $filters
     */
    public function paginateFor(User $viewer, Builder $query, array $filters): LengthAwarePaginator
    {
        $scope = $this->scope($viewer) ?? abort(403, 'Anda tidak memegang jabatan wilayah yang aktif.');

        $pendingIds = (clone $query)
            ->where('village_id', $viewer->village_id)
            ->where('status', self::STATUS_PENDING)
            ->when($scope['column'] !== null, fn ($pending) => $pending->where($scope['column'], $scope['area']))
            ->get()
            ->filter(fn (Model $request): bool => $this->canDecide($viewer, $request))
            ->modelKeys();

        return $query
            ->where('village_id', $viewer->village_id)
            ->where(function ($visible) use ($pendingIds, $scope): void {
                $visible->whereIn('id', $pendingIds)->orWhere(function ($decided) use ($scope): void {
                    $decided->where('status', '!=', self::STATUS_PENDING);

                    if ($scope['level'] !== self::LEVEL_STAF_SID) {
                        $decided->where('decided_level', $scope['level'])->where($scope['column'], $scope['area']);
                    }
                });
            })
            ->when($filters['status'] ?? null, fn ($filtered, $status) => $filtered->where('status', $status))
            ->orderByRaw('CASE WHEN status = ? THEN 0 ELSE 1 END', [self::STATUS_PENDING])
            ->latest('created_at')
            ->latest('id')
            ->paginate((int) ($filters['per_page'] ?? 20));
    }

    /**
     * Jenjang dan wilayah petugas yang melihat daftar permintaan.
     *
     * @return array{level: string, column: ?string, area: ?int}|null
     */
    private function scope(User $viewer): ?array
    {
        if (! $viewer->is_active || $viewer->village_id === null) {
            return null;
        }

        if ($viewer->role === UserRole::StafSid->value) {
            return ['level' => self::LEVEL_STAF_SID, 'column' => null, 'area' => null];
        }

        $official = $viewer->official;

        return match ($official?->position) {
            'rt' => $official->rt_id ? ['level' => self::LEVEL_RT, 'column' => 'rt_id', 'area' => (int) $official->rt_id] : null,
            'rw' => $official->rw_id ? ['level' => self::LEVEL_RW, 'column' => 'rw_id', 'area' => (int) $official->rw_id] : null,
            'kadus' => $official->hamlet_id ? ['level' => self::LEVEL_KADUS, 'column' => 'hamlet_id', 'area' => (int) $official->hamlet_id] : null,
            default => null,
        };
    }

    /**
     * Tanpa cache: susunan pejabat bisa berubah kapan saja, dan instance
     * service ini bisa dipakai ulang antar-request (controller di-cache route).
     *
     * @return Collection<int, User>
     */
    private function officialUsers(string $position, string $column, int $areaId): Collection
    {
        return User::query()
            ->where('is_active', true)
            ->whereHas('officials', fn ($query) => $query
                ->where('is_active', true)
                ->where('position', $position)
                ->where($column, $areaId))
            ->get();
    }
}
