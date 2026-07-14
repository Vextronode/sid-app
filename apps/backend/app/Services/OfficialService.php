<?php

namespace App\Services;

use App\Models\Citizen;
use App\Models\Official;

class OfficialService
{

    public function resolveRtForCitizen(Citizen $citizen)
    {
        return Official::where(
                'rt_id',
                $citizen->rt_id
            )
            ->where(
                'position',
                'rt'
            )
            ->where(
                'is_active',
                true
            )
            ->first();
    }

}