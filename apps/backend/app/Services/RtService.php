<?php

namespace App\Services;

use App\Exceptions\RegionContainsCitizensException;
use App\Exceptions\RegionHasActiveCitizensException;
use App\Models\Rt;
use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Repositories\RtRepository;
use App\Repositories\RwRepository;
use Illuminate\Database\Eloquent\Collection;

class RtService
{
    public function __construct(
        protected RtRepository $rtRepository,
        protected RwRepository $rwRepository,
        protected CitizenRepository $citizenRepository,
    ) {}

    public function getAllOrderedByNumber(User $user, ?int $rwId = null): Collection
    {
        return $this->rtRepository->allOrderedByNumber($this->villageId($user), $rwId);
    }

    public function create(array $data, User $user): Rt
    {
        $villageId = $this->villageId($user);
        $rw = $this->rwRepository->findOrFail($data['rw_id'], $villageId);

        return $this->rtRepository->create([
            'rw_id' => $data['rw_id'],
            'village_id' => $rw->hamlet->village_id,
            'number' => $data['number'],
            'full_label' => "RT {$data['number']} / RW {$rw->number}",
            'is_active' => true,
        ]);
    }

    public function update(Rt $rt, array $data, User $user): Rt
    {
        if ($rt->village_id !== $this->villageId($user)) {
            abort(404, 'RT tidak ditemukan.');
        }
        $isDeactivating = array_key_exists('is_active', $data)
            && ! $data['is_active']
            && $rt->is_active;

        if ($isDeactivating && $this->citizenRepository->existsActiveByRt($rt->id)) {
            throw new RegionHasActiveCitizensException('RT');
        }

        if (isset($data['number'])) {
            $rt->loadMissing('rw');
            $data['full_label'] = "RT {$data['number']} / RW {$rt->rw->number}";
        }

        return $this->rtRepository->update($rt, $data);
    }

    public function delete(Rt $rt, User $user): bool
    {
        if ($rt->village_id !== $this->villageId($user)) {
            abort(404, 'RT tidak ditemukan.');
        }
        if ($this->citizenRepository->existsByRt($rt->id)) {
            throw new RegionContainsCitizensException('RT');
        }

        return $this->rtRepository->delete($rt);
    }

    private function villageId(User $user): string
    {
        if ($user->role !== 'petugas_desa' || ! $user->is_active || ! $user->village_id) {
            abort(403, 'Petugas Desa aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
