<?php

namespace App\Services;

use App\Models\User;
use App\Models\VillageOrgPosition;
use App\Repositories\VillageOrgPositionRepository;
use Illuminate\Database\Eloquent\Collection;

class VillageOrgPositionService
{
    public function __construct(
        private readonly VillageOrgPositionRepository $repository,
    ) {}

    /**
     * Slot Ketua/Wakil Ketua/Anggota dibuat dulu bila belum ada, supaya
     * setiap organisasi selalu tampil lengkap meski belum pernah diisi.
     */
    public function list(User $user, ?string $orgType = null): Collection
    {
        foreach ($orgType !== null ? [$orgType] : VillageOrgPosition::ORG_TYPES as $type) {
            $this->repository->ensureSlots($user->village_id, $type);
        }

        return $this->repository->allForVillage($user->village_id, $orgType);
    }

    public function find(User $user, int $id): VillageOrgPosition
    {
        return $this->repository->findByIdForVillageOrFail($id, $user->village_id);
    }
}
