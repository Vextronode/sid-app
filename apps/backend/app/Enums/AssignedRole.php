<?php

namespace App\Enums;

enum AssignedRole: string
{
    case Rw = 'rw';

    public function label(): string
    {
        return match ($this) {
            self::Rw => 'RW',
        };
    }
}
