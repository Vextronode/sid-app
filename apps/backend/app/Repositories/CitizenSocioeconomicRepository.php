<?php

namespace App\Repositories;

use App\Models\CitizenSocioeconomic;

class CitizenSocioeconomicRepository
{
    public function findByCitizenId(int $citizenId): ?CitizenSocioeconomic
    {
        return CitizenSocioeconomic::query()->where('citizen_id', $citizenId)->first();
    }

    public function upsertForCitizen(int $citizenId, array $data): CitizenSocioeconomic
    {
        return CitizenSocioeconomic::updateOrCreate(
            ['citizen_id' => $citizenId],
            $data,
        );
    }
}
