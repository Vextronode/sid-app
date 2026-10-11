<?php

namespace App\Repositories;

use App\Models\OfficialPositionType;
use Illuminate\Database\Eloquent\Collection;

class OfficialPositionTypeRepository
{
    public function allForVillage(string $villageId, bool $activeOnly = false): Collection
    {
        return OfficialPositionType::query()
            ->where('village_id', $villageId)
            ->when($activeOnly, fn ($query) => $query->where('is_active', true))
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }

    public function findByCode(?string $villageId, string $code, bool $activeOnly = false): ?OfficialPositionType
    {
        if ($villageId === null || $code === '') {
            return null;
        }

        return OfficialPositionType::query()
            ->where('village_id', $villageId)
            ->where('code', $code)
            ->when($activeOnly, fn ($query) => $query->where('is_active', true))
            ->first();
    }

    public function findByIdForVillageOrFail(int $id, string $villageId): OfficialPositionType
    {
        return OfficialPositionType::query()
            ->where('village_id', $villageId)
            ->findOrFail($id);
    }

    public function nextSortOrder(string $villageId): int
    {
        return (int) OfficialPositionType::query()->where('village_id', $villageId)->max('sort_order') + 1;
    }

    public function create(array $data): OfficialPositionType
    {
        return OfficialPositionType::create($data);
    }

    public function update(OfficialPositionType $type, array $data): OfficialPositionType
    {
        $type->update($data);

        return $type;
    }

    public function delete(OfficialPositionType $type): void
    {
        $type->delete();
    }
}
