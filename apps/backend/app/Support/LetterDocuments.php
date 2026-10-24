<?php

namespace App\Support;

/**
 * Dokumen yang terbit untuk satu surat: dokumen utama (template jenis
 * surat) lalu dokumen yang terbit bersama (letter_types.documents) yang
 * syarat `when`-nya terpenuhi oleh jawaban form. Mis. layanan pindah
 * menerbitkan formulir pindah sekaligus formulir pendaftaran bila KK
 * ikut berubah.
 */
class LetterDocuments
{
    public const MAIN = 'main';

    /**
     * @param  array<int, array<string, mixed>>|null  $definitions  letter_types.documents (atau salinannya di snapshot)
     * @param  array<string, mixed>|null  $payload
     * @return array<int, array{key: string, title: string, template: string|null}>
     */
    public static function applicable(string $mainTitle, ?string $mainTemplate, ?array $definitions, ?array $payload): array
    {
        $documents = [['key' => self::MAIN, 'title' => $mainTitle, 'template' => $mainTemplate]];

        foreach ($definitions ?? [] as $definition) {
            if (! FieldCondition::matches($definition['when'] ?? null, $payload ?? [])) {
                continue;
            }

            $documents[] = [
                'key' => (string) $definition['key'],
                'title' => (string) ($definition['title'] ?? $definition['key']),
                'template' => $definition['template'] ?? null,
            ];
        }

        return $documents;
    }

    /**
     * @param  array<int, array{key: string, title: string, template: string|null}>  $documents
     * @return array{key: string, title: string, template: string|null}|null
     */
    public static function find(array $documents, ?string $key): ?array
    {
        $key = $key === null || $key === '' ? self::MAIN : $key;

        foreach ($documents as $document) {
            if ($document['key'] === $key) {
                return $document;
            }
        }

        return null;
    }
}
