<?php

namespace App\Enums;

enum FamilyRole: string
{
    case KEPALA_KELUARGA = 'kepala_keluarga';
    case ISTRI = 'istri';
    case SUAMI = 'suami';
    case ANAK = 'anak';
    case FAMILI_LAIN = 'famili_lain';

    /** Label SHDK (status hubungan dalam keluarga) untuk cetak surat. */
    public function label(): string
    {
        return match ($this) {
            self::KEPALA_KELUARGA => 'Kepala Keluarga',
            self::ISTRI => 'Istri',
            self::SUAMI => 'Suami',
            self::ANAK => 'Anak',
            self::FAMILI_LAIN => 'Famili Lain',
        };
    }
}
