<?php

namespace App\Policies;

use App\Models\Letter;
use App\Models\User;

class LetterPolicy
{
    public function __construct()
    {
        //
    }

    private const STAFF_ROLES = [
        'kepala_desa',
        'sekretaris_desa',
        'kasi_pelayanan',
        'kaur_tu_umum',
        'petugas_desa',
    ];

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Letter $letter): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function delete(User $user, Letter $letter): bool
    {
        $isOwner = $letter->submitted_by === $user->id;

        $isAuthorizedStaff = in_array($user->role, self::STAFF_ROLES, true);

        return $isOwner || $isAuthorizedStaff;
    }
}
