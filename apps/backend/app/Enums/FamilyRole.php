<?php

namespace App\Enums;

enum FamilyRole: string
{
    case KEPALA_KELUARGA = 'kepala_keluarga';
    case ISTRI = 'istri';
    case SUAMI = 'suami';
    case ANAK = 'anak';
    case FAMILI_LAIN = 'famili_lain';
}
