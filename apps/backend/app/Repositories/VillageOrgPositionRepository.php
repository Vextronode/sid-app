<?php

namespace App\Repositories;

use App\Models\VillageOrgPosition;
use Illuminate\Database\Eloquent\Collection;

class VillageOrgPositionRepository
{
    public function __construct()
    {
        //
    }

    public function allForVillage(int $villageId, ?string $orgType = null): Collection
    {
        return VillageOrgPosition::query()
            ->where('village_id', $villageId)
            ->when($orgType !== null, fn ($query) => $query->where('org_type', $orgType))
            ->with(['members' => fn ($query) => $query->orderByDesc('started_at')])
            ->orderBy('org_type')
            ->orderBy('sort_order')
            ->get();
    }

    public function findByIdOrFail(int $id): VillageOrgPosition
    {
        return VillageOrgPosition::query()->with('members')->findOrFail($id);
    }

    public function findByIdForVillageOrFail(int $id, int $villageId): VillageOrgPosition
    {
        return VillageOrgPosition::query()
            ->with(['members' => fn ($query) => $query->orderByDesc('started_at')])
            ->where('village_id', $villageId)
            ->findOrFail($id);
    }

    public function create(array $data): VillageOrgPosition
    {
        return VillageOrgPosition::create($data);
    }

    public function update(VillageOrgPosition $position, array $data): VillageOrgPosition
    {
        $position->update($data);

        return $position;
    }

    public function delete(VillageOrgPosition $position): void
    {
        $position->delete();
    }
}
