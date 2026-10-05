<?php

namespace App\Services;

use App\Exceptions\RegionContainsCitizensException;
use App\Exceptions\RegionHasActiveCitizensException;
use App\Models\Hamlet;
use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Repositories\HamletRepository;
use Illuminate\Database\Eloquent\Collection;

class HamletService
{
    public function __construct(
        protected HamletRepository $hamletRepository,
        protected CitizenRepository $citizenRepository,
    ) {}

    public function getAllOrderedByName(User $user): Collection
    {
        return $this->hamletRepository->allOrderedByName($this->villageId($user));
    }

    public function create(array $data, User $user): Hamlet
    {
        $villageId = $this->villageId($user);

        return $this->hamletRepository->create([
            'name' => $data['name'],
            'code' => $data['code'],
            'village_id' => $villageId,
            'is_active' => true,
        ]);
    }

    public function update(Hamlet $hamlet, array $data, User $user): Hamlet
    {
        if ($hamlet->village_id !== $this->villageId($user)) {
            abort(404, 'Dusun tidak ditemukan.');
        }
        $isDeactivating = array_key_exists('is_active', $data)
            && ! $data['is_active']
            && $hamlet->is_active;

        if ($isDeactivating && $this->citizenRepository->existsActiveByHamlet($hamlet->id)) {
            throw new RegionHasActiveCitizensException('dusun');
        }

        return $this->hamletRepository->update($hamlet, $data);
    }

    public function delete(Hamlet $hamlet, User $user): bool
    {
        if ($hamlet->village_id !== $this->villageId($user)) {
            abort(404, 'Dusun tidak ditemukan.');
        }
        if ($this->citizenRepository->existsByHamlet($hamlet->id)) {
            throw new RegionContainsCitizensException('dusun');
        }

        return $this->hamletRepository->delete($hamlet);
    }

    private function villageId(User $user): string
    {
        if ($user->role !== 'petugas_desa' || ! $user->is_active || ! $user->village_id) {
            abort(403, 'Petugas Desa aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
