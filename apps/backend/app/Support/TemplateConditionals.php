<?php

namespace App\Support;

/**
 * Blok bersyarat di template surat, dinilai terhadap jawaban form sebelum
 * placeholder diganti. Bentuk (boleh bersarang):
 *  - {{#if field}} ... {{/if}}            isian dijawab
 *  - {{#if field=a}} ... {{/if}}          jawaban sama dengan a
 *  - {{#if field=a|b}} ... {{/if}}        jawaban salah satu dari a, b
 *  - {{#if field!=a|b}} ... {{/if}}       jawaban bukan a atau b
 * Syaratnya sama dengan FieldCondition (visible_when isian, when dokumen).
 */
class TemplateConditionals
{
    private const BLOCK = '/\{\{#if\s+([a-zA-Z0-9_]+)\s*(?:(!=|=)\s*([^}]*?))?\s*\}\}((?:(?!\{\{#if\s).)*?)\{\{\/if\}\}/s';

    /**
     * @param  array<string, mixed>  $payload
     */
    public static function apply(string $template, array $payload): string
    {
        // Blok terdalam dinilai lebih dulu sampai tidak ada blok tersisa.
        do {
            $template = (string) preg_replace_callback(
                self::BLOCK,
                fn (array $match): string => FieldCondition::matches(self::condition($match), $payload) ? $match[4] : '',
                $template,
                -1,
                $count,
            );
        } while ($count > 0);

        return $template;
    }

    /**
     * @param  array<int, string>  $match
     * @return array<string, mixed>
     */
    private static function condition(array $match): array
    {
        $field = $match[1];
        $operator = $match[2] ?? '';

        if ($operator === '') {
            return ['field' => $field, 'filled' => true];
        }

        $values = array_map('trim', explode('|', $match[3] ?? ''));

        return $operator === '!='
            ? ['field' => $field, 'not_in' => $values]
            : ['field' => $field, 'in' => $values];
    }
}
