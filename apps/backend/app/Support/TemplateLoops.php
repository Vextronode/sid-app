<?php

namespace App\Support;

/**
 * Blok berulang di template surat untuk isian repeater dan family_members:
 *
 *   {{#each anak}}<tr><td>{{ no }}</td><td>{{ nama }}</td></tr>{{/each}}
 *
 * Di dalam blok, {{ no }} adalah nomor urut baris (mulai 1) dan
 * {{ <sub-isian> }} nilai baris itu yang sudah diformat dan di-escape.
 * Blok {{#if}} di dalamnya dinilai terhadap jawaban baris (ditambah
 * jawaban form). Isian tanpa baris menghasilkan blok kosong.
 */
class TemplateLoops
{
    private const BLOCK = '/\{\{#each\s+([a-zA-Z0-9_]+)\s*\}\}(.*?)\{\{\/each\}\}/s';

    /**
     * @param  array<int, array<string, mixed>>  $fields  definisi isian (letter_types.form_fields)
     * @param  array<string, mixed>  $payload
     */
    public static function apply(string $template, array $fields, array $payload): string
    {
        $definitions = array_column($fields, null, 'name');

        return (string) preg_replace_callback(self::BLOCK, function (array $match) use ($definitions, $payload): string {
            $rows = $payload[$match[1]] ?? [];

            if (! is_array($rows)) {
                return '';
            }

            $html = '';

            foreach (array_values($rows) as $index => $row) {
                $row = is_array($row) ? $row : [];
                $values = self::rowValues($definitions[$match[1]] ?? [], $row);
                $values['no'] = (string) ($index + 1);

                $body = TemplateConditionals::apply($match[2], [...$payload, ...$row]);
                $html .= preg_replace_callback(
                    '/\{\{\s*([a-zA-Z0-9_]+)\s*}}/',
                    fn (array $placeholder): string => $values[$placeholder[1]] ?? $placeholder[0],
                    $body,
                );
            }

            return $html;
        }, $template);
    }

    /**
     * Nilai siap cetak (sudah di-escape) untuk satu baris.
     *
     * @param  array<string, mixed>  $field
     * @param  array<string, mixed>  $row
     * @return array<string, string>
     */
    private static function rowValues(array $field, array $row): array
    {
        // Baris family_members sudah berupa teks siap cetak.
        if (($field['type'] ?? null) !== 'repeater') {
            return array_map(fn (mixed $value): string => e(is_scalar($value) ? (string) $value : ''), $row);
        }

        $formatted = LetterValueFormatter::format($field['fields'] ?? [], $row);

        return [
            ...array_map(fn (string $value): string => e($value), $formatted['text']),
            ...$formatted['html'],
        ];
    }
}
