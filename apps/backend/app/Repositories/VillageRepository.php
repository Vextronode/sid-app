<?php

namespace App\Repositories;

use App\Models\Village;

class VillageRepository
{
    public function findById(string $id): ?Village
    {
        return Village::query()->find($id);
    }

    public function findByCode(string $code): ?Village
    {
        return Village::query()->where('code', $code)->first();
    }

    public function count(): int
    {
        return Village::query()->count();
    }

    /** Kept for single-village public installations; multi-village pages resolve by village code. */
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
