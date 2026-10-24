<?php

namespace App\Enums;

/**
 * Kelompok jenis surat di pilihan pengajuan. Urutan case = urutan tampil:
 * Persuratan Desa (surat keterangan desa, Axx) lalu Pelayanan Desa
 * (formulir kependudukan untuk instansi luar, Fxx).
 */
enum LetterTypeCategory: string
{
    case Persuratan = 'persuratan';
    case Pelayanan = 'pelayanan';

    public function label(): string
    {
        return match ($this) {
            self::Persuratan => 'Persuratan Desa',
            self::Pelayanan => 'Pelayanan Desa',
        };
    }
}
