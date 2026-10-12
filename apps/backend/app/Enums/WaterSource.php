<?php

namespace App\Enums;

enum WaterSource: string
{
    case PDAM = 'pdam';
    case SUMUR = 'sumur';
    case SUNGAI = 'sungai';
    case LAINNYA = 'lainnya';
}
