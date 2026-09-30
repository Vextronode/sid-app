<?php

namespace App\Repositories;

use App\Models\CitizenSocioeconomic;

class CitizenSocioeconomicRepository
{
    public function findByCitizenId(string $citizenId): ?CitizenSocioeconomic
    {
        return CitizenSocioeconomic::query()->where('citizen_id', $citizenId)->first();
    }

    public function upsertForCitizen(string $citizenId, array $data): CitizenSocioeconomic
    {
        return CitizenSocioeconomic::updateOrCreate(
            ['citizen_id' => $citizenId],
            $data,
        );
    }
}
