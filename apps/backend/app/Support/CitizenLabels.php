<?php

namespace App\Support;

/**
 * Label kolom data warga untuk cetak surat dan pilihan form surat,
 * sama dengan label di frontend (shared/lib/labels.js).
 */
class CitizenLabels
{
    public const LAST_EDUCATION = [
        'tidak_sekolah' => 'Tidak Sekolah',
        'sd' => 'SD',
        'smp' => 'SMP',
        'sma' => 'SMA',
        'diploma' => 'Diploma',
        's1' => 'S1',
        's2' => 'S2',
        's3' => 'S3',
    ];

    public const RELIGION = [
        'islam' => 'Islam',
        'kristen' => 'Kristen',
        'katolik' => 'Katolik',
        'hindu' => 'Hindu',
        'buddha' => 'Buddha',
        'konghucu' => 'Konghucu',
    ];

    public const MARITAL_STATUS = [
        'belum_kawin' => 'Belum Kawin',
        'kawin' => 'Kawin',
        'cerai_hidup' => 'Cerai Hidup',
        'cerai_mati' => 'Cerai Mati',
    ];

    /**
     * @param  array<string, string>  $labels
     */
    public static function of(array $labels, mixed $value): string
    {
        $value = $value instanceof \BackedEnum ? $value->value : $value;

        return $labels[(string) $value] ?? '-';
    }
}
