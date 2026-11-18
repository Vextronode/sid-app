<?php

namespace App\Policies;

use App\Enums\AssignedRole;
use App\Enums\UserRole;
use App\Models\LetterType;
use App\Models\MigrantWorker;
use App\Models\User;

class MigrantWorkerPolicy
{
    /**
     * Data CPMI (baca saja): Staf SIDUTama, Kepala Desa/Sekdes (yang
     * menyetujui pengajuannya), dan petugas yang ditugaskan pada F11
     * (letter_types.assigned_role; NULL = Kasi Pemerintahan dan Kaur TU &
     * Umum, seperti LetterPolicy).
     */
    public function viewAny(User $user): bool
    {
        if (! $user->is_active || $user->village_id === null) {
            return false;
        }

        if (in_array($user->role, [UserRole::StafSid->value, 'kepala_desa', 'sekretaris_desa'], true)) {
            return true;
        }

        if (! in_array($user->role, array_column(AssignedRole::cases(), 'value'), true)) {
            return false;
        }

        $type = LetterType::query()
            ->where('village_id', $user->village_id)
            ->where('code', MigrantWorker::SOURCE_LETTER_TYPE_CODE)
            ->first(['id', 'assigned_role']);

        $assigned = $type?->assigned_role;
        $assigned = $assigned instanceof \BackedEnum ? $assigned->value : $assigned;

        return $type !== null && ($assigned === null || $assigned === $user->role);
    }

    /** Petugas desa yang sama, atau warga pemilik data. */
    public function view(User $user, MigrantWorker $worker): bool
    {
        if ($user->is_active && $user->citizen_id !== null && $worker->citizen_id === $user->citizen_id) {
            return true;
        }

        return $worker->village_id === $user->village_id
            && $this->viewAny($user);
    }
}
