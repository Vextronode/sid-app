<?php

namespace App\Repositories;

use App\Models\Citizen;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class CitizenRepository
{
    public const DEFAULT_PER_PAGE = 20;

    public function __construct()
    {
        //
    }

    /**
     * Daftar warga satu desa, berpaginasi; pencarian nama dan filter
     * Dusun/RW/RT dijalankan di database. RW dan Dusun dibaca lewat RT
     * warga agar mengikuti hierarki wilayah.
     *
     * @param  array{search?: ?string, hamlet_id?: int|string|null, rw_id?: int|string|null, rt_id?: int|string|null, per_page?: int|string|null}  $filters
     */
    public function paginateWithWilayah(string $villageId, array $filters = []): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));

        return Citizen::query()
            ->where('village_id', $villageId)
            ->when($search !== '', fn ($query) => $query->whereRaw(
                'LOWER(name) LIKE ?',
                ['%'.addcslashes(mb_strtolower($search), '\\%_').'%'],
            ))
            ->when(! empty($filters['hamlet_id']), fn ($query) => $query->whereHas(
                'rt.rw',
                fn ($rwQuery) => $rwQuery->where('hamlet_id', $filters['hamlet_id']),
            ))
            ->when(! empty($filters['rw_id']), fn ($query) => $query->whereHas(
                'rt',
                fn ($rtQuery) => $rtQuery->where('rw_id', $filters['rw_id']),
            ))
            ->when(! empty($filters['rt_id']), fn ($query) => $query->where('rt_id', $filters['rt_id']))
            ->with(['rt', 'rw', 'hamlet', 'village', 'occupation', 'family'])
            ->orderBy('name')
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? self::DEFAULT_PER_PAGE));
    }

    public function findByNikHash(string $nikHash): ?Citizen
    {
        return Citizen::query()->where('nik_hash', $nikHash)->first();
    }

    public function findOrFail(string $id): Citizen
    {
        return Citizen::query()->findOrFail($id);
    }

    public function findForVillageOrFail(string $id, string $villageId): Citizen
    {
        return Citizen::query()->where('village_id', $villageId)->findOrFail($id);
    }

    public function create(array $data): Citizen
    {
        return Citizen::create($data);
    }

    public function update(Citizen $citizen, array $data): Citizen
    {
        $citizen->update($data);

        return $citizen;
    }

    public function existsFamilyHead(string $familyId, ?string $excludeCitizenId = null): bool
    {
        return Citizen::query()
            ->where('family_id', $familyId)
            ->where('family_role', 'kepala_keluarga')
            ->where('is_active', true)
            ->when($excludeCitizenId, fn ($q) => $q->where('id', '!=', $excludeCitizenId))
            ->exists();
    }

    public function findByFamilyId(string $familyId): Collection
    {
        return Citizen::query()
            ->with(['rt', 'rw', 'hamlet', 'village', 'occupation'])
            ->where('family_id', $familyId)
            ->orderBy('name')
            ->get();
    }

    public function delete(Citizen $citizen): bool
    {
        return $citizen->delete();
    }

    public function distinctWilayah(string $villageId): Collection
    {
        return Citizen::query()
            ->with(['rt.rw'])
            ->where('village_id', $villageId)
            ->select('rt_id')
            ->distinct()
            ->get();
    }

    public function existsByHamlet(int $hamletId): bool
    {
        return Citizen::query()->where('hamlet_id', $hamletId)->exists();
    }

    public function existsActiveByHamlet(int $hamletId): bool
    {
        return Citizen::query()
            ->where('hamlet_id', $hamletId)
            ->where('is_active', true)
            ->exists();
    }

    public function existsByRw(int $rwId): bool
    {
        return Citizen::query()
            ->whereHas('rt', fn ($query) => $query->where('rw_id', $rwId))
            ->exists();
    }

    public function existsActiveByRw(int $rwId): bool
    {
        return Citizen::query()
            ->whereHas('rt', fn ($query) => $query->where('rw_id', $rwId))
            ->where('is_active', true)
            ->exists();
    }

    public function existsByRt(int $rtId): bool
    {
        return Citizen::query()->where('rt_id', $rtId)->exists();
    }

    public function existsActiveByRt(int $rtId): bool
    {
        return Citizen::query()
            ->where('rt_id', $rtId)
            ->where('is_active', true)
            ->exists();
    }

    public function countByGender(string $villageId, string $gender, ?int $rtId = null, ?int $rwId = null): int
    {
        $query = Citizen::query()
            ->where('village_id', $villageId)
            ->where('gender', $gender);

        if ($rtId !== null) {
            $query->where('rt_id', $rtId);
        }

        if ($rwId !== null) {
            $query->whereHas('rt', fn ($rtQuery) => $rtQuery->where('rw_id', $rwId));
        }

        return $query->count();
    }

    /**
     * @return array<string, int> jumlah warga berkunci gender (L/P)
     */
    public function countGroupedByGender(string $villageId, ?int $rtId = null, ?int $rwId = null): array
    {
        return Citizen::query()
            ->where('village_id', $villageId)
            ->where('is_active', true)
            ->when($rtId !== null, fn ($query) => $query->where('rt_id', $rtId))
            ->when($rwId !== null, fn ($query) => $query->whereHas('rt', fn ($rtQuery) => $rtQuery->where('rw_id', $rwId)))
            ->selectRaw('gender, COUNT(*) as aggregate')
            ->groupBy('gender')
            ->pluck('aggregate', 'gender')
            ->map(fn ($count): int => (int) $count)
            ->all();
    }

    public function countActiveByVillage(string $villageId): int
    {
        return Citizen::query()
            ->where('village_id', $villageId)
            ->where('is_active', true)
            ->count();
    }
}
