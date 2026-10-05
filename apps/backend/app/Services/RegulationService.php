<?php

namespace App\Services;

use App\Models\User;
use App\Models\VillageRegulation;
use App\Repositories\RegulationRepository;
use Illuminate\Database\Eloquent\Collection;

class RegulationService
{
    public function __construct(
        private readonly RegulationRepository $repository,
    ) {}

    public function list(User $user): Collection
    {
        return $this->repository->allForVillage($user->village_id);
    }

    public function create(User $user, array $data): VillageRegulation
    {
        return $this->repository->create([
            'village_id' => $user->village_id,
            'created_by' => $user->id,
            'regulation_number' => $data['regulation_number'],
            'title' => $data['title'],
            'content' => $data['content'],
            'enacted_date' => $data['enacted_date'] ?? null,
        ]);
    }

    public function update(int $id, array $data, User $user): VillageRegulation
    {
        $regulation = $this->repository->findByIdForVillageOrFail($id, $this->villageId($user));

        return $this->repository->update($regulation, $data);
    }

    public function delete(int $id, User $user): void
    {
        $regulation = $this->repository->findByIdForVillageOrFail($id, $this->villageId($user));

        $this->repository->delete($regulation);
    }

    private function villageId(User $user): string
    {
        if ($user->role !== 'petugas_desa' || ! $user->is_active || ! $user->village_id) abort(403, 'Petugas Desa aktif dengan desa yang valid diperlukan.');
        return $user->village_id;
    }
}
