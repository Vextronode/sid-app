<?php

namespace App\Casts;

use Illuminate\Support\Carbon;

/**
 * Tanggal terenkripsi (pengganti cast `date`): dibaca sebagai Carbon awal
 * hari, disimpan sebagai `Y-m-d` terenkripsi.
 */
class EncryptedDate extends EncryptedValue
{
    protected function encode(mixed $value): string
    {
        return Carbon::parse($value)->format('Y-m-d');
    }

    protected function decode(string $value): Carbon
    {
        return Carbon::parse($value)->startOfDay();
    }
}
