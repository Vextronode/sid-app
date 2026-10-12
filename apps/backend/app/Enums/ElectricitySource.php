<?php

namespace App\Enums;

enum ElectricitySource: string
{
    case PLN = 'pln';
    case NON_PLN = 'non_pln';
    case TIDAK_ADA = 'tidak_ada';
}
