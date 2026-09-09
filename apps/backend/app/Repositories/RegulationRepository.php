<?php

namespace App\Repositories;

use App\Models\VillageRegulation;
use Illuminate\Database\Eloquent\Collection;

class RegulationRepository
{
    public function allForVillage(int $villageId): Collection
    {
        return VillageRegulation::query()
            ->where('village_id', $villageId)
            ->latest('enacted_date')
            ->get();
    }

    public function findByIdOrFail(int $id): VillageRegulation
    {
        return VillageRegulation::query()->findOrFail($id);
    }

    public function create(array $data): VillageRegulation
    {
        return VillageRegulation::create($data);
    }

    public function update(VillageRegulation $regulation, array $data): VillageRegulation
    {
        $regulation->update($data);

        return $regulation;
    }

    public function delete(VillageRegulation $regulation): void
    {
        $regulation->delete();
    }
}
