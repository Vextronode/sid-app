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
        return $user->village_id !== null;
    }

    public function create(User $user): bool
    {
        return $user->role === 'petugas_desa' && $user->village_id !== null;
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
            return (int) $region->village_id === (int) $user->village_id;
        }

        if ($region instanceof Rw) {
            return (int) $region->hamlet?->village_id === (int) $user->village_id;
        }

        return (int) $region->rw?->hamlet?->village_id === (int) $user->village_id;
    }
}
