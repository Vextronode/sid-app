<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/**
 * Dasar cast terenkripsi untuk tipe yang belum didukung cast `encrypted`
 * bawaan Laravel (tanggal, boolean, enum). Nilai disimpan sebagai
 * ciphertext di kolom `text`; turunan cukup menentukan bentuk string
 * nilainya (encode) dan cara membacanya kembali (decode).
 *
 * Ciphertext selalu berbeda walau nilainya sama, sehingga nilai yang
 * tidak berubah tetap memakai ciphertext lama: model tidak dianggap
 * berubah dan Log Aktivitas tidak mencatat perubahan palsu.
 *
 * @implements CastsAttributes<mixed, mixed>
 */
abstract class EncryptedValue implements CastsAttributes, EncryptedCast
{
    abstract protected function encode(mixed $value): string;

    abstract protected function decode(string $value): mixed;

    public function get(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        return $value === null ? null : $this->decode(Crypt::decryptString($value));
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null) {
            return null;
        }

        $plain = $this->encode($value);
        $stored = $attributes[$key] ?? null;

        if ($stored !== null) {
            try {
                if (Crypt::decryptString($stored) === $plain) {
                    return $stored;
                }
            } catch (DecryptException) {
                // Nilai lama bukan ciphertext yang sah: timpa.
            }
        }

        return Crypt::encryptString($plain);
    }
}
