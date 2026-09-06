<?php

namespace App\Services;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
use App\Repositories\OfficialRepository;

class OfficialService
{
    public function __construct(
        protected OfficialRepository $officialRepository,
        protected UserRepository $userRepository,
    ) {}

    public function resolveRtForCitizen(Citizen $citizen)
    {
        return $this->officialRepository->findActiveRtByRtId($citizen->rt_id);
    }

    public function getCurrentOfficial(User $user): Official
    {
        return $user->official()
            ->where('is_active', true)
            ->firstOrFail();
    }

    public function getCurrentRw(User $user): Official
    {
        return $user->official()
            ->where('position', 'rw')
            ->where('is_active', true)
            ->firstOrFail();
    }

    public function getCurrentRt(User $user): Official
    {
        return $user->official()
            ->where('position', 'rt')
            ->where('is_active', true)
            ->firstOrFail();
    }

    public function resolveNextOfficials(
        Official $official
    ) {

        return match ($official->position) {

            'rt' => $this->officialRepository->allActiveRwByRwId($official->rw_id),

            'rw' => $this->officialRepository->allActiveByPositionsAndVillage([
                'kasi_pelayanan',
                'kaur_tu_umum',
                'petugas_desa',
            ], $official->village_id),

            default => collect(),
        };
    }

    public function resolveCitizenUser(
        Letter $letter
    ): ?User {

        return $this->userRepository->findByCitizenId($letter->citizen_id);
    }

    public function resolveVillageHead(): ?Official
    {
        return $this->officialRepository->findActiveVillageHead();
    }
}
