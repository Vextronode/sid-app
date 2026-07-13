<?php

namespace App\Enums;

enum AssignedRole: string
{
    case KasiPelayanan = 'kasi_pelayanan';
    case KaurTuUmum = 'kaur_tu_umum';

    public function label(): string
    {
        return match ($this) {
            self::KasiPelayanan => 'Kasi Pelayanan',
            self::KaurTuUmum => 'Kaur TU Umum',
        };
    }
}
