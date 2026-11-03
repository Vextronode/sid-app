<?php

namespace App\Casts;

/**
 * Boolean terenkripsi (pengganti cast `boolean`).
 */
class EncryptedBoolean extends EncryptedValue
{
    protected function encode(mixed $value): string
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN) ? '1' : '0';
    }

    protected function decode(string $value): bool
    {
        return $value === '1';
    }
}
