<?php

namespace App\Services;

use App\Models\User;
use App\Models\Village;
use App\Repositories\VillageRepository;
use Symfony\Component\HttpKernel\Exception\HttpException;

class VillageProfileService
{
    public function __construct(
        private readonly VillageRepository $repository,
    ) {}

    public function getProfile(User $user): Village
    {
        $village = $this->repository->findById($user->village_id);

        if (! $village) {
            throw new HttpException(404, 'Profil desa belum tersedia.');
        }

        return $village;
    }

    public function updateProfile(User $user, array $data): Village
    {
        $village = $this->getProfile($user);

        return $this->repository->update($village, $data);
    }
}
