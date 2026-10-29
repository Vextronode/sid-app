<?php

namespace App\Enums;

/**
 * Kelompok jenis surat di pilihan pengajuan. Urutan case = urutan tampil:
 * Persuratan Desa (surat keterangan desa, Axx) lalu Layanan Kependudukan
 * (formulir kependudukan untuk instansi luar, Fxx). Diatur Staf SIDUTama;
 * petugas yang menangani mengikuti kategori.
 */
enum LetterTypeCategory: string
{
    case Persuratan = 'persuratan';
    case Pelayanan = 'pelayanan';

    public function label(): string
    {
        return match ($this) {
            self::Persuratan => 'Persuratan Desa',
            self::Pelayanan => 'Layanan Kependudukan',
        };
    }

    /** Petugas yang menangani surat setelah terbit (letter_types.assigned_role). */
    public function handlerRole(): AssignedRole
    {
        return match ($this) {
            self::Persuratan => AssignedRole::KaurTuUmum,
            self::Pelayanan => AssignedRole::KasiPemerintahan,
        };
    }
}
