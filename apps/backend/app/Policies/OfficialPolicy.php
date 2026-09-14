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
        'kepala_desa',
        'sekretaris_desa',
        'petugas_desa',
    ];

    public function viewAny(User $user): bool
    {
        return in_array($user->role, self::MANAGER_ROLES, true);
    }

    public function view(User $user, Official $official): bool
    {
        return in_array($user->role, self::MANAGER_ROLES, true);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, self::MANAGER_ROLES, true);
    }

    public function update(User $user, Official $official): bool
    {
        return in_array($user->role, self::MANAGER_ROLES, true);
    }

    public function delete(User $user, Official $official): bool
    {
        return in_array($user->role, self::MANAGER_ROLES, true);
    }
}
