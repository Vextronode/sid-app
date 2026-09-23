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
     * Aturan scope di bawah SENGAJA dibuat SEPADAN dengan
     * LetterService::getScopedLetters() (bukan aturan baru) supaya "siapa
     * boleh lihat daftar" dan "siapa boleh buka detail" konsisten:
     *  - warga         : hanya submitted_by miliknya sendiri (TDD-01 Table 3)
     *  - rt             : hanya surat di rt_id wilayahnya (TDD-01 Table 3)
     *  - rw             : hanya surat di rw_id wilayahnya (read-only FYI,
     *                     TDD-01 Table 3 — tanpa filter status, sama
     *                     seperti scopeForRw())
     *  - kepala_desa,
     *    sekretaris_desa,
     *    kasi_pelayanan,
     *    kaur_tu_umum   : hanya surat di village_id yang sama (sepadan
     *                     scopeForKadesSekdes()/scopeForKasiKaur() — TIDAK
     *                     dibatasi ketat ke current_step_order dirinya
     *                     sendiri, karena UC-04c/UC-04d Main Flow poin 2
     *                     memang meminta mereka bisa melihat "seluruh
     *                     riwayat keputusan sebelumnya" satu desa, bukan
     *                     cuma surat yang sedang di step-nya)
     *  - petugas_desa   : full visibility (TDD-01 Table 3 — semua surat,
     *                     termasuk rejected di step manapun)
     *  - kadus          : selalu ditolak (dihapus total dari domain
     *                     approval surat, SID-ARCH-BE-001 S3.2) — TIDAK
     *                     memicu exception seperti abort(403) di
     *                     LetterService, cukup return false karena Policy
     *                     memang mengharapkan boolean.
     *
     * CATATAN KOMPATIBILITAS: perubahan ini mengubah kontrak
     * `test_view_allows_any_authenticated_user` di LetterPolicyTest, yang
     * SEBELUMNYA sengaja menguji bahwa warga sembarang boleh melihat
     * surat siapa pun. Test itu perlu diupdate mengikuti aturan baru di
     * atas (lihat catatan test terpisah) — bukan kelalaian, melainkan
     * bagian yang wajib disesuaikan bersamaan dengan patch ini.
     */
    public function view(User $user, Letter $letter): bool
    {
        return match ($user->role) {
            'warga' => $letter->submitted_by === $user->id,
            'rt' => $this->isSameRt($user, $letter),
            'rw' => $this->isSameRw($user, $letter),
            'petugas_desa' => true,
            default => in_array($user->role, self::VILLAGE_SCOPED_ROLES, true)
                && $this->isSameVillage($user, $letter),
        };
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
