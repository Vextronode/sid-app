<?php

namespace App\Services;

use App\Models\Citizen;
use App\Repositories\CitizenRepository;
use Illuminate\Database\Eloquent\Collection;

class CitizenService
{
    public function __construct(
        protected CitizenRepository $citizenRepository
    ) {}

    public function getAllWithWilayah(): Collection
    {
        return $this->citizenRepository->allWithWilayah();
    }

    public function delete(Citizen $citizen): bool
    {
        return $this->citizenRepository->delete($citizen);
    }

    public function getDistinctWilayah(): Collection
    {
        return $this->citizenRepository->distinctWilayah();
    }
}
