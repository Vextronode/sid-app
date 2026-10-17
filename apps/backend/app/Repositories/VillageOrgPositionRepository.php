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

    /**
     * Membuat slot Ketua/Wakil Ketua/Anggota yang belum ada untuk organisasi
     * desa. Aman dipanggil berulang.
     */
    public function ensureSlots(string $villageId, string $orgType): void
    {
        foreach (VillageOrgPosition::SLOTS as $slot => $definition) {
            VillageOrgPosition::query()->firstOrCreate(
                ['village_id' => $villageId, 'org_type' => $orgType, 'slot' => $slot],
                [
                    'position_label' => $definition['label'],
                    'is_single_occupant' => $definition['single'],
                    'sort_order' => $definition['order'],
                    'is_active' => true,
                ],
            );
        }
    }

    public function findSlot(string $villageId, string $orgType, string $slot): VillageOrgPosition
    {
        $this->ensureSlots($villageId, $orgType);

        return VillageOrgPosition::query()
            ->where('village_id', $villageId)
            ->where('org_type', $orgType)
            ->where('slot', $slot)
            ->firstOrFail();
    }

    public function allForVillage(string $villageId, ?string $orgType = null): Collection
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

    public function findByIdForVillageOrFail(int $id, string $villageId): VillageOrgPosition
    {
        return VillageOrgPosition::query()
            ->with(['members' => fn ($query) => $query->orderByDesc('started_at')])
            ->where('village_id', $villageId)
            ->findOrFail($id);
    }
}
