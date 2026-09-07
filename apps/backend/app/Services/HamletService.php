<?php

namespace App\Services;

use App\Models\Hamlet;
use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Repositories\HamletRepository;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Database\Eloquent\Collection;

class HamletService
{
    public function __construct(
        protected HamletRepository $hamletRepository,
        protected CitizenRepository $citizenRepository,
    ) {}

    public function getAllOrderedByName(): Collection
    {
        return $this->hamletRepository->allOrderedByName();
    }

    public function create(array $data, User $user): Hamlet
    {
        return $this->hamletRepository->create([
            'name' => $data['name'],
            'code' => $data['code'],
            'village_id' => $user->village_id,
            'is_active' => true,
        ]);
    }

    public function update(Hamlet $hamlet, array $data): Hamlet
    {
        $this->guardDeactivation($data, $hamlet);

        return $this->hamletRepository->update($hamlet, $data);
    }

    public function delete(Hamlet $hamlet): bool
    {
        if ($this->citizenRepository->existsByHamlet($hamlet->id)) {
            abort(409, 'Dusun tidak bisa dihapus karena masih ada warga terdaftar di wilayah ini.');
        }

        return $this->hamletRepository->delete($hamlet);
    }

    private function guardDeactivation(array $data, Hamlet $hamlet): void
    {
        $isDeactivating = array_key_exists('is_active', $data)
            && ! $data['is_active']
            && $hamlet->is_active;

        if ($isDeactivating && $this->citizenRepository->existsActiveByHamlet($hamlet->id)) {
            throw new HttpException(409, 'Dusun tidak bisa dinonaktifkan karena masih ada warga aktif terdaftar di wilayah ini.');
        }
    }
}
