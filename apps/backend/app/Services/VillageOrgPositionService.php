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

    public function list(User $user, ?string $orgType = null): Collection
    {
        return $this->repository->allForVillage($user->village_id, $orgType);
    }

    public function create(User $user, array $data): VillageOrgPosition
    {
        return $this->repository->create([
            'village_id' => $user->village_id,
            'org_type' => $data['org_type'],
            'position_label' => $data['position_label'],
            'is_single_occupant' => $data['is_single_occupant'] ?? true,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
        ]);
    }

    public function find(int $id): VillageOrgPosition
    {
        return $this->repository->findByIdOrFail($id);
    }

    public function update(int $id, array $data): VillageOrgPosition
    {
        $position = $this->repository->findByIdOrFail($id);

        return $this->repository->update($position, $data);
    }

    public function delete(int $id): void
    {
        $position = $this->repository->findByIdOrFail($id);

        $this->repository->delete($position);
    }
}
