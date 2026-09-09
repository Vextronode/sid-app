<?php

namespace App\Repositories;

use App\Models\Village;

class VillageRepository
{
    public function findById(int $id): ?Village
    {
        return Village::query()->find($id);
    }

    public function update(Village $village, array $data): Village
    {
        $village->update($data);

        return $village;
    }
}
