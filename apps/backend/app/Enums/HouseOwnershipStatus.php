<?php

namespace App\Enums;

enum HouseOwnershipStatus: string
{
    case MILIK_SENDIRI = 'milik_sendiri';
    case SEWA = 'sewa';
    case MENUMPANG = 'menumpang';
    case DINAS = 'dinas';
}
