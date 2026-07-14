<?php

namespace App\Enums;

enum LetterVerificationType: string
{
    case Auto = 'auto';
    case Manual = 'manual';
    case Document = 'document';

    public function label(): string
    {
        return match ($this) {
            self::Auto => 'Otomatis',
            self::Manual => 'Manual',
            self::Document => 'Dokumen',
        };
    }
}
