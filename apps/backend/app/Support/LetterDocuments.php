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
     * @param  string|null  $mainPaper  ukuran kertas dokumen utama (letter_types.paper_size)
     * @return array<int, array{key: string, title: string, template: string|null, orientation: string, paper: string}>
     */
    public static function applicable(string $mainTitle, ?string $mainTemplate, ?array $definitions, ?array $payload, ?string $mainPaper = null): array
    {
        $documents = [['key' => self::MAIN, 'title' => $mainTitle, 'template' => $mainTemplate, 'orientation' => 'portrait', 'paper' => PaperSize::normalize($mainPaper)]];

        foreach ($definitions ?? [] as $definition) {
            if (! FieldCondition::matches($definition['when'] ?? null, $payload ?? [])) {
                continue;
            }

            $documents[] = [
                'key' => (string) $definition['key'],
                'title' => (string) ($definition['title'] ?? $definition['key']),
                'template' => $definition['template'] ?? null,
                // Formulir lebar (mis. F-1.01) dicetak mendatar.
                'orientation' => ($definition['orientation'] ?? null) === 'landscape' ? 'landscape' : 'portrait',
                'paper' => PaperSize::normalize($definition['paper'] ?? null),
            ];
        }

        return $documents;
    }

    /**
     * @param  array<int, array{key: string, title: string, template: string|null, orientation: string, paper: string}>  $documents
     * @return array{key: string, title: string, template: string|null, orientation: string, paper: string}|null
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
