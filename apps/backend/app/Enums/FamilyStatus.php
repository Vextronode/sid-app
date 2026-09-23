<?php

namespace App\Enums;

enum FamilyStatus: string
{
    case AKTIF = 'aktif';
    case PINDAH = 'pindah';
    case BUBAR = 'bubar';
}
