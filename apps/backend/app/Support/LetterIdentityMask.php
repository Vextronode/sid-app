<?php

namespace App\Support;

use Illuminate\Support\Arr;

/**
 * NIK / No. KK pihak lain di isian surat (payload) dikirim tersamar ke API
 * (`************1234`); nilai utuh dibuka lewat
 * IdentityRevealService::letterPayload() yang tercatat. PDF surat tetap
 * memuat data lengkap.
 *
 * Dikenali dari nilainya (string 16 digit, sesuai validasi isian NIK/No.
 * KK), bukan hanya dari form_fields: payload juga memuat isian turunan
 * (mis. `nik_ayah`, No. KK saksi) dan baris susunan KK yang tidak
 * terdaftar sebagai isian.
 */
final class LetterIdentityMask
{
    public static function isIdentity(mixed $value): bool
    {
        return (is_string($value) || is_int($value)) && preg_match('/^\d{16}$/', (string) $value) === 1;
    }

    public static function mask(string|int $value): string
    {
        return str_repeat('*', 12).substr((string) $value, -4);
    }

    /**
     * Payload tersamar beserta path (notasi titik, mis. `nik_ayah` atau
     * `kk_pendaftaran.1.nik`) setiap nilai yang disamarkan.
     *
     * @param  array<string, mixed>|null  $payload
     * @return array{0: array<string, mixed>|null, 1: list<string>}
     */
    public static function apply(?array $payload): array
    {
        if ($payload === null) {
            return [null, []];
        }

        $paths = [];

        return [self::walk($payload, '', $paths), $paths];
    }

    /**
     * Nilai utuh pada path, atau null bila path itu bukan NIK/No. KK.
     *
     * @param  array<string, mixed>|null  $payload
     */
    public static function valueAt(?array $payload, string $path): ?string
    {
        $value = Arr::get($payload ?? [], $path);

        return self::isIdentity($value) ? (string) $value : null;
    }

    /**
     * @param  array<array-key, mixed>  $values
     * @param  list<string>  $paths
     * @return array<array-key, mixed>
     */
    private static function walk(array $values, string $prefix, array &$paths): array
    {
        foreach ($values as $key => $value) {
            $path = $prefix.$key;

            if (is_array($value)) {
                $values[$key] = self::walk($value, $path.'.', $paths);
            } elseif (self::isIdentity($value)) {
                $values[$key] = self::mask($value);
                $paths[] = $path;
            }
        }

        return $values;
    }
}
