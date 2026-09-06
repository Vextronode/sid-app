<?php

namespace App\Services;

use App\Models\Rw;
use App\Repositories\CitizenRepository;
use App\Repositories\RwRepository;
use HttpException;
use Illuminate\Database\Eloquent\Collection;

class RwService
{
    public function __construct(
        protected RwRepository $rwRepository,
        protected CitizenRepository $citizenRepository,
    ) {}

    public function getAllOrderedByNumber(?int $hamletId = null): Collection
    {
        return $this->rwRepository->allOrderedByNumber($hamletId);
    }

    public function create(array $data): Rw
    {
        return $this->rwRepository->create([
            'hamlet_id' => $data['hamlet_id'],
            'number' => $data['number'],
            'full_label' => "RW {$data['number']}",
            'is_active' => true,
        ]);
    }

    public function update(Rw $rw, array $data): Rw
    {
        $this->guardDeactivation($data, $rw);

        if (isset($data['number'])) {
            $data['full_label'] = "RW {$data['number']}";
        }

        return $this->rwRepository->update($rw, $data);
    }

    public function delete(Rw $rw): bool
    {
        if ($this->citizenRepository->existsByRw($rw->id)) {
            abort(409, 'RW tidak bisa dihapus karena masih ada warga terdaftar di wilayah ini.');
        }

        return $this->rwRepository->delete($rw);
    }

    private function guardDeactivation(array $data, Rw $rw): void
    {
        $isDeactivating = array_key_exists('is_active', $data)
            && ! $data['is_active']
            && $rw->is_active;

        if ($isDeactivating && $this->citizenRepository->existsActiveByRw($rw->id)) {
            throw new HttpException(409, 'RW tidak bisa dinonaktifkan karena masih ada warga aktif terdaftar di wilayah ini.');
        }
    }
}
