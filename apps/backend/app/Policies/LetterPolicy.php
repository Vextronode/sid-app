<?php

namespace App\Policies;

use App\Models\Letter;
use App\Models\Official;
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

    /**
     * Posisi yang scope aksesnya berbasis village_id (bukan wilayah RT/RW
     * spesifik) — sama seperti pola LetterService::scopeForKadesSekdes()
     * dan scopeForKasiKaur().
     */
    private const VILLAGE_SCOPED_ROLES = [
        'kepala_desa',
        'sekretaris_desa',
        'kasi_pelayanan',
        'kaur_tu_umum',
    ];

    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Pemohon selalu dapat melihat suratnya. Kasi/Kaur hanya dapat
     * melihat surat approved di desanya yang ditugaskan ke role mereka
     * (atau belum ditugaskan); akses role lain tetap sesuai scope lama.
     */
    public function view(User $user, Letter $letter): bool
    {
        if ($letter->submitted_by === $user->id) {
            return true;
        }

        return match ($user->role) {
            'warga' => false,
            'rt' => $this->isSameRt($user, $letter),
            'rw' => $this->isSameRw($user, $letter),
            'petugas_desa' => true,
            'kasi_pelayanan', 'kaur_tu_umum' => $letter->status->value === 'approved'
                && $this->isSameVillage($user, $letter)
                && ($letter->letterType?->assigned_role === null
                    || $letter->letterType->assigned_role === $user->role),
            default => in_array($user->role, self::VILLAGE_SCOPED_ROLES, true)
                && $this->isSameVillage($user, $letter),
        };
    }

    public function create(User $user): bool
    {
        return $user->is_active && $user->citizen_id !== null;
    }

    public function download(User $user, Letter $letter): bool
    {
        if ($letter->status->value !== 'approved') {
            return false;
        }

        if ($letter->submitted_by === $user->id || $user->role === 'petugas_desa') {
            return true;
        }

        if (in_array($user->role, ['kepala_desa', 'sekretaris_desa'], true)) {
            return $this->isSameVillage($user, $letter);
        }

        if (in_array($user->role, ['kasi_pelayanan', 'kaur_tu_umum'], true)) {
            return $this->isSameVillage($user, $letter)
                && ($letter->letterType?->assigned_role === null
                    || $letter->letterType->assigned_role === $user->role);
        }

        return false;
    }

    public function delete(User $user, Letter $letter): bool
    {
        $isOwner = $letter->submitted_by === $user->id;

        $isAuthorizedStaff = in_array($user->role, self::STAFF_ROLES, true);

        return $isOwner || $isAuthorizedStaff;
    }

    /**
     * Resolve official aktif milik user, TANPA melempar exception bila
     * tidak ditemukan (beda sengaja dari
     * OfficialRepository::findActiveForUserOrFail() yang dipakai
     * OfficialService — Policy harus selalu balikin boolean, bukan
     * 404/500 tak terduga untuk kombinasi data yang longgar, mis. user
     * ber-role 'rt' tapi baru dibuat dan belum sempat di-assign ke
     * tabel officials).
     */
    private function currentOfficial(User $user, ?string $position = null): ?Official
    {
        $query = Official::query()
            ->where('user_id', $user->id)
            ->where('is_active', true);

        if ($position !== null) {
            $query->where('position', $position);
        }

        return $query->first();
    }

    private function isSameRt(User $user, Letter $letter): bool
    {
        $official = $this->currentOfficial($user, 'rt');

        if (! $official || ! $official->rt_id) {
            return false;
        }

        return $letter->citizen?->rt_id === $official->rt_id;
    }

    private function isSameRw(User $user, Letter $letter): bool
    {
        $official = $this->currentOfficial($user, 'rw');

        if (! $official || ! $official->rw_id) {
            return false;
        }

        return $letter->citizen?->rt?->rw_id === $official->rw_id;
    }

    private function isSameVillage(User $user, Letter $letter): bool
    {
        $official = $this->currentOfficial($user);

        if (! $official) {
            return false;
        }

        return $letter->village_id === $official->village_id;
    }
}
