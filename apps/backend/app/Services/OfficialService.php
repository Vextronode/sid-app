<?php

namespace App\Services;

use App\Models\Citizen;
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

}