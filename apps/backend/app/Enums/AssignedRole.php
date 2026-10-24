<?php

namespace App\Enums;

enum AssignedRole: string
{
    case KasiPemerintahan = 'kasi_pemerintahan';
    case KaurTuUmum = 'kaur_tu_umum';

    public function label(): string
    {
        return match ($this) {
            self::KasiPemerintahan => 'Kasi Pemerintahan',
            self::KaurTuUmum => 'Kaur TU & Umum',
        };
    }
}
