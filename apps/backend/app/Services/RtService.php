<?php

namespace App\Services;

use App\Models\Rt;
use App\Repositories\CitizenRepository;
use App\Repositories\RtRepository;
use App\Repositories\RwRepository;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Database\Eloquent\Collection;

class RtService
{
    public function __construct(
        protected RtRepository $rtRepository,
        protected RwRepository $rwRepository,
        protected CitizenRepository $citizenRepository,
    ) {}

    public function getAllOrderedByNumber(?int $rwId = null): Collection
    {
        return $this->rtRepository->allOrderedByNumber($rwId);
    }

    public function create(array $data): Rt
    {
        $rw = $this->rwRepository->findOrFail($data['rw_id']);

        return $this->rtRepository->create([
            'rw_id' => $data['rw_id'],
            'number' => $data['number'],
            'full_label' => "RT {$data['number']} / RW {$rw->number}",
            'is_active' => true,
        ]);
    }

    public function update(Rt $rt, array $data): Rt
    {
        $this->guardDeactivation($data, $rt);

        if (isset($data['number'])) {
            $rt->loadMissing('rw');
            $data['full_label'] = "RT {$data['number']} / RW {$rt->rw->number}";
        }

        return $this->rtRepository->update($rt, $data);
    }

    public function delete(Rt $rt): bool
    {
        if ($this->citizenRepository->existsByRt($rt->id)) {
            abort(409, 'RT tidak bisa dihapus karena masih ada warga terdaftar di wilayah ini.');
        }

        return $this->rtRepository->delete($rt);
    }

    private function guardDeactivation(array $data, Rt $rt): void
    {
        $isDeactivating = array_key_exists('is_active', $data)
            && ! $data['is_active']
            && $rt->is_active;

        if ($isDeactivating && $this->citizenRepository->existsActiveByRt($rt->id)) {
            throw new HttpException(409, 'RT tidak bisa dinonaktifkan karena masih ada warga aktif terdaftar di wilayah ini.');
        }
    }
}
