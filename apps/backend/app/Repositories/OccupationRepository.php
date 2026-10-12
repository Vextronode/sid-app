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
