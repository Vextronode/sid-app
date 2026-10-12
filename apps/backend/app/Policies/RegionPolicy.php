<?php

namespace App\Policies;

use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;

class RegionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_active && $user->village_id !== null;
    }

    public function create(User $user): bool
    {
        return $user->role === 'petugas_desa' && $user->is_active && $user->village_id !== null;
    }

    public function update(User $user, Hamlet|Rw|Rt $region): bool
    {
        return $this->create($user)
            && $this->belongsToUserVillage($user, $region);
    }

    public function delete(User $user, Hamlet|Rw|Rt $region): bool
    {
        return $this->update($user, $region);
    }

    private function belongsToUserVillage(User $user, Hamlet|Rw|Rt $region): bool
    {
        if ($region instanceof Hamlet) {
            return $region->village_id === $user->village_id;
        }

        if ($region instanceof Rw) {
            return $region->hamlet?->village_id === $user->village_id;
        }

        return $region->rw?->hamlet?->village_id === $user->village_id;
    }
}
