<?php

namespace App\Repositories;

use App\Models\FamilySocioeconomic;

class FamilySocioeconomicRepository
{
    public function findByFamilyId(string $familyId): ?FamilySocioeconomic
    {
        return FamilySocioeconomic::query()->where('family_id', $familyId)->first();
    }

    public function upsertForFamily(string $familyId, array $data): FamilySocioeconomic
    {
        return FamilySocioeconomic::updateOrCreate(
            ['family_id' => $familyId],
            $data,
        );
    }
}
