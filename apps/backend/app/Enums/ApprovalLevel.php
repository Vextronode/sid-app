<?php

namespace App\Enums;

enum ApprovalLevel: string
{
    case RT = 'rt';
    case KEPALA_DESA = 'kepala_desa';
    case SEKDES = 'sekdes';
    case KASI_PELAYANAN = 'kasi_pelayanan';
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
