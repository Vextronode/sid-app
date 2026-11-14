<?php

namespace App\Policies;

use App\Enums\AssignedRole;
use App\Enums\UserRole;
use App\Models\CitizenBusiness;
use App\Models\LetterType;
use App\Models\User;

class CitizenBusinessPolicy
{
    /**
     * Data Usaha Warga (baca saja): Staf SIDUTama, dan petugas yang
     * ditugaskan pada SKU desanya (letter_types.assigned_role milik A01;
     * NULL = Kasi Pemerintahan dan Kaur TU & Umum, seperti LetterPolicy).
     * Petugas mengikuti jenis surat, jadi akses ikut pindah bila kategori
     * SKU diubah.
     */
    public function viewAny(User $user): bool
    {
        if (! $user->is_active || $user->village_id === null) {
            return false;
        }

        if ($user->role === UserRole::StafSid->value) {
            return true;
        }

        if (! in_array($user->role, array_column(AssignedRole::cases(), 'value'), true)) {
            return false;
        }

        $sku = LetterType::query()
            ->where('village_id', $user->village_id)
            ->where('code', CitizenBusiness::SOURCE_LETTER_TYPE_CODE)
            ->first(['id', 'assigned_role']);

        return $sku !== null
            && ($sku->assigned_role === null || $sku->assigned_role === $user->role);
    }

    public function view(User $user, CitizenBusiness $business): bool
    {
        return $business->village_id === $user->village_id
            && $this->viewAny($user);
    }

    /** Daftar atau daftar ulang ke Cimart: hanya warga pemilik usaha. */
    public function requestCimart(User $user, CitizenBusiness $business): bool
    {
        return $this->owns($user, $business);
    }

    public function cancelCimart(User $user, CitizenBusiness $business): bool
    {
        return $this->owns($user, $business);
    }

    private function owns(User $user, CitizenBusiness $business): bool
    {
        return $user->is_active
            && $user->citizen_id !== null
            && $business->citizen_id === $user->citizen_id;
    }
}
