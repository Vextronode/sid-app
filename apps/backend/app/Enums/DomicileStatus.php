<?php

namespace App\Enums;

enum DomicileStatus: string
{
    case MENETAP = 'menetap';
    case MERANTAU_DALAM_NEGERI = 'merantau_dalam_negeri';
    case MERANTAU_LUAR_NEGERI = 'merantau_luar_negeri';
    case TKI = 'tki';
}
