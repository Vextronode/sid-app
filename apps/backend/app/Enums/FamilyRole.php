<?php

namespace App\Enums;

/**
 * SHDK (status hubungan dalam keluarga) resmi Disdukcapil, urut sesuai
 * kodenya (1 Kepala Keluarga ... 11 Lainnya).
 */
enum FamilyRole: string
{
    case KEPALA_KELUARGA = 'kepala_keluarga';
    case SUAMI = 'suami';
    case ISTRI = 'istri';
    case ANAK = 'anak';
    case MENANTU = 'menantu';
    case CUCU = 'cucu';
    case ORANG_TUA = 'orang_tua';
    case MERTUA = 'mertua';
    case FAMILI_LAIN = 'famili_lain';
    case PEMBANTU = 'pembantu';
    case LAINNYA = 'lainnya';

    /** Label SHDK (status hubungan dalam keluarga) untuk cetak surat. */
    public function label(): string
    {
        return match ($this) {
            self::KEPALA_KELUARGA => 'Kepala Keluarga',
            self::SUAMI => 'Suami',
            self::ISTRI => 'Istri',
            self::ANAK => 'Anak',
            self::MENANTU => 'Menantu',
            self::CUCU => 'Cucu',
            self::ORANG_TUA => 'Orang Tua',
            self::MERTUA => 'Mertua',
            self::FAMILI_LAIN => 'Famili Lain',
            self::PEMBANTU => 'Pembantu',
            self::LAINNYA => 'Lainnya',
        };
    }

    /**
     * Pilihan hubungan anggota selain kepala keluarga, [nilai => label].
     *
     * @return array<string, string>
     */
    public static function memberOptions(): array
    {
        $options = [];

        foreach (self::cases() as $role) {
            if ($role !== self::KEPALA_KELUARGA) {
                $options[$role->value] = $role->label();
            }
        }

        return $options;
    }
}
