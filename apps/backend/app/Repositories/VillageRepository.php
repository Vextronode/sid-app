<?php

namespace App\Repositories;

use App\Models\Village;

class VillageRepository
{
    public function findById(int $id): ?Village
    {
        return Village::query()->find($id);
    }

    /**
     * UC-16. SIDUTama berdiri satu instance per desa (Independent Domain,
     * SID-ARCH-SYS-001 S1) - endpoint publik tidak punya user login untuk
     * resolve village_id, jadi selalu mengambil satu-satunya village yang ada.
     */
    public function findFirst(): ?Village
    {
        return Village::query()->first();
    }

    public function update(Village $village, array $data): Village
    {
        $village->update($data);

        return $village;
    }
}
