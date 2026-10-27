<?php

namespace App\Enums;

enum ApprovalLevel: string
{
    case RT = 'rt';
    case KEPALA_DESA = 'kepala_desa';
    case SEKRETARIS_DESA = 'sekretaris_desa';
    case KASI_PEMERINTAHAN = 'kasi_pemerintahan';
    case KAUR_TU_UMUM = 'kaur_tu_umum';

    /**
     * @return array<int, self>
     */
    public static function approverCases(): array
    {
        return [
            self::RT,
            self::KEPALA_DESA,
        ];
    }
}
