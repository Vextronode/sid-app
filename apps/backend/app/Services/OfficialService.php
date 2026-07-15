<?php

namespace App\Services;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\Official;
use App\Models\User;

class OfficialService
{
    public function resolveRtForCitizen(Citizen $citizen)
    {
        return Official::where('rt_id', $citizen->rt_id)
            ->where('position', 'rt')
            ->where('is_active', true)
            ->first();
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

    public function resolveNextOfficial(
        Official $official
    ): ?Official {

        return match ($official->position) {

            'rt' => Official::where('rw_id', $official->rw_id)
                ->where('position', 'rw')
                ->where('is_active', true)
                ->first(),

            'rw' => Official::where('hamlet_id', $official->hamlet_id)
                ->where('position', 'kadus')
                ->where('is_active', true)
                ->first(),

            'kadus' => Official::where('position', 'kasi_pelayanan')
                ->where('village_id', $official->village_id)
                ->where('is_active', true)
                ->first(),

            'kasi_pelayanan' => Official::where('position', 'kaur_tu_umum')
                ->where('village_id', $official->village_id)
                ->where('is_active', true)
                ->first(),

            default => null,
        };
    }

    public function resolveCitizenUser(
        Letter $letter
    ): ?User {

        return User::where(
            'citizen_id',
            $letter->citizen_id
        )->first();
    }
}