<?php

namespace App\Repositories;

use App\Models\Occupation;
use Illuminate\Database\Eloquent\Collection;

class OccupationRepository
{
    public function allForVillage(string $villageId, bool $includeInactive = false): Collection
    {
        return Occupation::query()
            ->where('village_id', $villageId)
            ->when(! $includeInactive, fn ($query) => $query->where('is_active', true))
            ->when($includeInactive, fn ($query) => $query->withCount('citizens'))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
    }

    public function findForVillageOrFail(int $id, string $villageId): Occupation
    {
        return Occupation::query()->where('village_id', $villageId)->findOrFail($id);
    }

    public function maxSortOrder(string $villageId): ?int
    {
        $max = Occupation::query()->where('village_id', $villageId)->max('sort_order');

        return $max === null ? null : (int) $max;
    }

    /**
     * Pindahkan pekerjaan lain desa ini yang memakai urutan $from ke $to.
     */
    public function moveSortOrder(string $villageId, int $from, int $to, ?int $exceptId = null): void
    {
        Occupation::query()
            ->where('village_id', $villageId)
            ->where('sort_order', $from)
            ->when($exceptId !== null, fn ($query) => $query->whereKeyNot($exceptId))
            ->update(['sort_order' => $to]);
    }

    public function create(array $data): Occupation
    {
        return Occupation::create($data);
    }

    public function update(Occupation $occupation, array $data): Occupation
    {
        $occupation->update($data);

        return $occupation;
    }

    public function delete(Occupation $occupation): bool
    {
        return $occupation->delete();
    }
}
