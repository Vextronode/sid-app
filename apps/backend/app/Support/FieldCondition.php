<?php

namespace App\Support;

/**
 * Syarat berbasis jawaban form, mis. dokumen yang hanya terbit untuk
 * pilihan tertentu. Bentuk:
 *  - {"field": "status_kawin", "equals": "belum_tercatat"}
 *  - {"field": "jenis", "in": ["kk_baru", "pisah_kk"]}
 *  - {"field": "jenis", "not_in": ["lainnya"]}
 *  - {"field": "nik_ayah", "filled": true}
 * Tanpa syarat (null) selalu terpenuhi.
 */
class FieldCondition
{
    /**
     * @param  array<string, mixed>|null  $when
     * @param  array<string, mixed>  $payload
     */
    public static function matches(?array $when, array $payload): bool
    {
        if ($when === null || $when === []) {
            return true;
        }

        $value = $payload[$when['field'] ?? ''] ?? null;
        $text = is_scalar($value) ? (string) $value : null;

        return match (true) {
            array_key_exists('equals', $when) => $text === (string) $when['equals'],
            array_key_exists('in', $when) => in_array($text, array_map('strval', (array) $when['in']), true),
            array_key_exists('not_in', $when) => ! in_array($text, array_map('strval', (array) $when['not_in']), true),
            array_key_exists('filled', $when) => ($text !== null && trim($text) !== '') === (bool) $when['filled'],
            default => true,
        };
    }
}
