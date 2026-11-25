<?php

namespace App\Policies;

use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class RegionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_active && $user->village_id !== null;
    }

    public function create(User $user): bool
    {
        return $user->role === 'staf_sid' && $user->is_active && $user->village_id !== null;
    }

    /**
     * Wilayah desa lain dijawab 404, sama dengan data warga/KK desa lain:
     * keberadaannya tidak dibocorkan. Peran yang memang tidak boleh
     * mengelola wilayah tetap 403.
     */
    public function update(User $user, Hamlet|Rw|Rt $region): Response
    {
        if (! $this->create($user)) {
            return Response::deny();
        }

        return $this->belongsToUserVillage($user, $region)
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    public function delete(User $user, Hamlet|Rw|Rt $region): Response
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
