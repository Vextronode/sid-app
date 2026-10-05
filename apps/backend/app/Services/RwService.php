<?php

namespace App\Services;

use App\Exceptions\RegionContainsCitizensException;
use App\Exceptions\RegionHasActiveCitizensException;
use App\Models\Hamlet;
use App\Models\Rw;
use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Repositories\RwRepository;
use Illuminate\Database\Eloquent\Collection;

class RwService
{
    public function __construct(
        protected RwRepository $rwRepository,
        protected CitizenRepository $citizenRepository,
    ) {}

    public function getAllOrderedByNumber(User $user, ?int $hamletId = null): Collection
    {
        return $this->rwRepository->allOrderedByNumber($this->villageId($user), $hamletId);
    }

    public function create(array $data, User $user): Rw
    {
        $hamlet = Hamlet::findOrFail($data['hamlet_id']);
        if ($hamlet->village_id !== $this->villageId($user)) {
            abort(422, 'Dusun harus berasal dari desa Anda.');
        }

        return $this->rwRepository->create([
            'hamlet_id' => $data['hamlet_id'],
            'village_id' => $hamlet->village_id,
            'number' => $data['number'],
            'full_label' => "RW {$data['number']}",
            'is_active' => true,
        ]);
    }

    public function update(Rw $rw, array $data, User $user): Rw
    {
        if ($rw->village_id !== $this->villageId($user)) {
            abort(404, 'RW tidak ditemukan.');
        }
        $isDeactivating = array_key_exists('is_active', $data)
            && ! $data['is_active']
            && $rw->is_active;

        if ($isDeactivating && $this->citizenRepository->existsActiveByRw($rw->id)) {
            throw new RegionHasActiveCitizensException('RW');
        }

        if (isset($data['number'])) {
            $data['full_label'] = "RW {$data['number']}";
        }

        return $this->rwRepository->update($rw, $data);
    }

    public function delete(Rw $rw, User $user): bool
    {
        if ($rw->village_id !== $this->villageId($user)) {
            abort(404, 'RW tidak ditemukan.');
        }
        if ($this->citizenRepository->existsByRw($rw->id)) {
            throw new RegionContainsCitizensException('RW');
        }

        return $this->rwRepository->delete($rw);
    }

    private function villageId(User $user): string
    {
        if ($user->role !== 'petugas_desa' || ! $user->is_active || ! $user->village_id) {
            abort(403, 'Petugas Desa aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
