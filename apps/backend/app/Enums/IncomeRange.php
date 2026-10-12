<?php

namespace App\Enums;

enum IncomeRange: string
{
    case UNDER_1JT = '<1jt';
    case ONE_TO_3JT = '1-3jt';
    case THREE_TO_5JT = '3-5jt';
    case FIVE_TO_10JT = '5-10jt';
    case ABOVE_10JT = '>10jt';
}
