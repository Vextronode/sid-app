<?php

namespace App\Support;

/**
 * Nomor RW/RT disimpan tiga digit ("1" -> "001"), sama dengan data desa.
 *
 * Dengan satu format, unique index rws (village_id, number) dan rts
 * (rw_id, number) benar-benar mencegah "1" dan "001" sama-sama ada, dan
 * urutan teks orderBy('number') sama dengan urutan angkanya.
 */
final class AreaNumber
{
    /** Aturan validasi setelah normalize(): tiga digit, 001 sampai 999. */
    public const RULE = 'regex:/^(?!000)\d{3}$/';

    /**
     * Nomor yang hanya berisi angka dijadikan tiga digit. Nilai lain
     * dikembalikan apa adanya (dipangkas) supaya ditolak validasi.
     */
    public static function normalize(mixed $number): mixed
    {
        if (! is_string($number) && ! is_int($number)) {
            return $number;
        }

        $trimmed = trim((string) $number);

        if (! ctype_digit($trimmed)) {
            return $trimmed;
        }

        return str_pad(ltrim($trimmed, '0'), 3, '0', STR_PAD_LEFT);
    }
}
