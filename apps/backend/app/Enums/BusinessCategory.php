<?php

namespace App\Enums;

/**
 * Kategori usaha dari form Surat Keterangan Usaha (A01). Nilai case adalah
 * kontrak dengan Cimart (`category` di API integrasi): jangan diganti
 * setelah rilis. Label boleh diperbarui.
 */
enum BusinessCategory: string
{
    case Kelontong = 'kelontong';
    case Kuliner = 'kuliner';
    case NonKuliner = 'non_kuliner';

    public function label(): string
    {
        return match ($this) {
            self::Kelontong => 'Toko Kelontong',
            self::Kuliner => 'Toko Kuliner',
            self::NonKuliner => 'Toko Non Kuliner',
        };
    }

    /**
     * Pilihan isian select (nilai => label), sesuai urutan case.
     *
     * @return array<string, string>
     */
    public static function options(): array
    {
        $options = [];

        foreach (self::cases() as $case) {
            $options[$case->value] = $case->label();
        }

        return $options;
    }
}
