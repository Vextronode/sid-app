<?php

namespace App\Policies;

use App\Models\Official;
use App\Models\User;

class OfficialPolicy
{
    public function __construct()
    {
        //
    }

    private const MANAGER_ROLES = [
        'petugas_desa',
    ];

    public function viewAny(User $user): bool
    {
        return in_array($user->role, self::MANAGER_ROLES, true)
            && $user->is_active
            && $user->village_id !== null;
    }

    public function view(User $user, Official $official): bool
    {
        return $this->managesVillage($user, $official);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, self::MANAGER_ROLES, true) && $user->is_active && $user->village_id !== null;
    }

    public function update(User $user, Official $official): bool
    {
        return $this->managesVillage($user, $official);
    }

    public function delete(User $user, Official $official): bool
    {
        return $this->managesVillage($user, $official);
    }

    private function managesVillage(User $user, Official $official): bool
    {
        return in_array($user->role, self::MANAGER_ROLES, true)
            && $user->is_active
            && $user->village_id !== null
            && $official->village_id === $user->village_id;
    }
}
