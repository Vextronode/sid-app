<?php

namespace App\Services;

use app\Models\Citizen;
use app\Models\Letter;
use app\Models\Official;
use app\Models\User;

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

    public function resolveNextOfficials(
        Official $official
    ) {

        return match ($official->position) {

            'rt' => Official::where('rw_id', $official->rw_id)
                ->where('position', 'rw')
                ->where('is_active', true)
                ->get(),

            'rw' => Official::whereIn('position', [
                'kasi_pelayanan',
                'kaur_tu_umum',
                'petugas_desa',
            ])
                ->where('village_id', $official->village_id)
                ->where('is_active', true)
                ->get(),

            default => collect(),
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

    public function resolveVillageHead(): ?Official
    {
        return Official::where('position', 'kepala_desa')
            ->where('is_active', true)
            ->first();
    }
}
