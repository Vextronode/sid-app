<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/**
 * Mengubah nilai isian form menjadi teks siap cetak di surat, menurut
 * tipe isian pada definisi jenis surat:
 *  - date    -> "1 Oktober 2026", plus {{ <nama>_hari }} "Kamis, 1 Oktober 2026"
 *  - number  -> "1.500.000", plus {{ <nama>_terbilang }} "satu juta lima ratus ribu"
 *  - select  -> label pilihan
 *  - textarea-> baris baru dipertahankan
 */
class LetterValueFormatter
{
    private const UNITS = [
        '', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas',
    ];

    /**
     * @param  array<int, array<string, mixed>>  $fields  definisi isian (letter_types.form_fields)
     * @param  array<string, mixed>  $payload
     * @return array{text: array<string, string>, html: array<string, string>} nilai per nama placeholder;
     *                                                                         `text` belum di-escape, `html` sudah aman
     */
    public static function format(array $fields, array $payload): array
    {
        $definitions = [];
        foreach ($fields as $field) {
            if (isset($field['name'])) {
                $definitions[$field['name']] = $field;
            }
        }

        $text = [];
        $html = [];

        foreach ($payload as $name => $value) {
            if (! is_scalar($value) || $value === '') {
                continue;
            }

            $value = (string) $value;
            $definition = $definitions[$name] ?? [];

            switch ($definition['type'] ?? 'text') {
                case 'date':
                    $date = self::parseDate($value);
                    $text[$name] = $date ? $date->translatedFormat('j F Y') : $value;
                    if ($date) {
                        $text["{$name}_hari"] = $date->translatedFormat('l, j F Y');
                    }
                    break;

                case 'number':
                    if (is_numeric($value)) {
                        $amount = (int) round((float) $value);
                        $text[$name] = number_format($amount, 0, ',', '.');
                        $text["{$name}_terbilang"] = self::terbilang($amount);
                    } else {
                        $text[$name] = $value;
                    }
                    break;

                case 'select':
                    $text[$name] = self::optionLabel($definition['options'] ?? [], $value);
                    break;

                case 'textarea':
                    $html[$name] = nl2br(e($value), false);
                    break;

                default:
                    $text[$name] = $value;
            }
        }

        return ['text' => $text, 'html' => $html];
    }

    public static function terbilang(int $number): string
    {
        if ($number === 0) {
            return 'nol';
        }

        if ($number < 0) {
            return 'minus '.self::terbilang(-$number);
        }

        return trim(preg_replace('/\s+/', ' ', self::spell($number)));
    }

    private static function spell(int $number): string
    {
        return match (true) {
            $number < 12 => self::UNITS[$number],
            $number < 20 => self::spell($number - 10).' belas',
            $number < 100 => self::spell(intdiv($number, 10)).' puluh '.self::spell($number % 10),
            $number < 200 => 'seratus '.self::spell($number - 100),
            $number < 1000 => self::spell(intdiv($number, 100)).' ratus '.self::spell($number % 100),
            $number < 2000 => 'seribu '.self::spell($number - 1000),
            $number < 1_000_000 => self::spell(intdiv($number, 1000)).' ribu '.self::spell($number % 1000),
            $number < 1_000_000_000 => self::spell(intdiv($number, 1_000_000)).' juta '.self::spell($number % 1_000_000),
            $number < 1_000_000_000_000 => self::spell(intdiv($number, 1_000_000_000)).' miliar '.self::spell($number % 1_000_000_000),
            default => self::spell(intdiv($number, 1_000_000_000_000)).' triliun '.self::spell($number % 1_000_000_000_000),
        };
    }

    private static function parseDate(string $value): ?Carbon
    {
        try {
            return Carbon::parse($value)->locale('id');
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $options
     */
    private static function optionLabel(array $options, string $value): string
    {
        foreach ($options as $option) {
            if ((string) ($option['value'] ?? '') === $value) {
                return (string) ($option['label'] ?? $value);
            }
        }

        return $value;
    }
}
