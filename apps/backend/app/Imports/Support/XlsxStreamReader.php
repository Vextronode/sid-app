<?php

namespace App\Imports\Support;

use DOMElement;
use Generator;
use RuntimeException;
use XMLReader;
use ZipArchive;

/**
 * Pembaca .xlsx baris demi baris dengan XMLReader. PhpSpreadsheet memuat
 * seluruh XML sheet ke memori (SimpleXML), sedangkan sheet PEMUTAKHIRAN di
 * file pemutakhiran data pemilih berukuran puluhan MB karena kolom rumus
 * bantunya, sehingga kehabisan memori meski memakai read filter.
 *
 * Sel rumus memakai hasil hitung terakhir yang disimpan Excel (<v>).
 */
final class XlsxStreamReader
{
    /** @var array<string, string>|null nama sheet => path XML di dalam zip */
    private ?array $sheets = null;

    /** @var list<string>|null */
    private ?array $sharedStrings = null;

    public function __construct(private readonly string $path) {}

    /** @return list<string> */
    public function sheetNames(): array
    {
        return array_keys($this->sheets());
    }

    /**
     * @param  (callable(string): bool)|null  $wantColumn  sel kolom lain dilewati tanpa diurai
     * @return Generator<int, array<string, array{value: mixed, numeric: bool}>> nomor baris => huruf kolom => sel
     */
    public function rows(string $sheet, ?callable $wantColumn = null): Generator
    {
        $entry = $this->sheets()[$sheet] ?? throw new RuntimeException("Sheet {$sheet} tidak ditemukan.");
        $sharedStrings = $this->sharedStrings();
        $xml = $this->open($entry);

        $rowNumber = 0;
        $cells = [];

        try {
            while ($xml->read()) {
                if ($xml->nodeType === XMLReader::END_ELEMENT && $xml->localName === 'row') {
                    yield $rowNumber => $cells;

                    continue;
                }

                if ($xml->nodeType !== XMLReader::ELEMENT) {
                    continue;
                }

                if ($xml->localName === 'row') {
                    $rowNumber = (int) ($xml->getAttribute('r') ?: $rowNumber + 1);
                    $cells = [];

                    if ($xml->isEmptyElement) {
                        yield $rowNumber => $cells;
                    }

                    continue;
                }

                if ($xml->localName !== 'c') {
                    continue;
                }

                $column = (string) preg_replace('/\d+/', '', (string) $xml->getAttribute('r'));

                if ($column === '' || ($wantColumn !== null && ! $wantColumn($column))) {
                    continue;
                }

                $node = $xml->expand();

                if ($node instanceof DOMElement) {
                    $cells[$column] = self::cell($node, (string) $xml->getAttribute('t'), $sharedStrings);
                }
            }
        } finally {
            $xml->close();
        }
    }

    /**
     * @param  list<string>  $sharedStrings
     * @return array{value: mixed, numeric: bool}
     */
    private static function cell(DOMElement $node, string $type, array $sharedStrings): array
    {
        $raw = null;
        $inline = null;

        foreach ($node->childNodes as $child) {
            if ($child instanceof DOMElement && $child->localName === 'v') {
                $raw = $child->textContent;
            } elseif ($child instanceof DOMElement && $child->localName === 'is') {
                $inline = self::text($child);
            }
        }

        return match ($type) {
            's' => ['value' => $sharedStrings[(int) $raw] ?? null, 'numeric' => false],
            'inlineStr' => ['value' => $inline, 'numeric' => false],
            'str' => ['value' => $raw, 'numeric' => false],
            'b' => ['value' => $raw === '1', 'numeric' => false],
            'e' => ['value' => null, 'numeric' => false],
            default => $raw === null || $raw === ''
                ? ['value' => null, 'numeric' => false]
                : ['value' => preg_match('/^-?\d+$/', $raw) === 1 ? (int) $raw : (float) $raw, 'numeric' => true],
        };
    }

    /** Isi teks <si>/<is>, termasuk rich text (<r><t>), tanpa teks fonetik. */
    private static function text(DOMElement $node): string
    {
        $text = '';

        foreach ($node->childNodes as $child) {
            if (! $child instanceof DOMElement) {
                continue;
            }

            if ($child->localName === 't') {
                $text .= $child->textContent;
            } elseif ($child->localName === 'r') {
                $text .= self::text($child);
            }
        }

        return $text;
    }

    /** @return array<string, string> */
    private function sheets(): array
    {
        if ($this->sheets !== null) {
            return $this->sheets;
        }

        $zip = new ZipArchive;

        if ($zip->open($this->path) !== true) {
            throw new RuntimeException('File .xlsx tidak dapat dibuka.');
        }

        $workbook = simplexml_load_string((string) $zip->getFromName('xl/workbook.xml'));
        $rels = simplexml_load_string((string) $zip->getFromName('xl/_rels/workbook.xml.rels'));
        $zip->close();

        if ($workbook === false || $rels === false) {
            throw new RuntimeException('Struktur file .xlsx tidak dikenali.');
        }

        $targets = [];
        foreach ($rels->children() as $rel) {
            $target = ltrim((string) $rel['Target'], '/');
            $targets[(string) $rel['Id']] = str_starts_with($target, 'xl/') ? $target : 'xl/'.$target;
        }

        $this->sheets = [];
        $relNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

        foreach ($workbook->sheets->sheet ?? [] as $sheet) {
            $id = (string) $sheet->attributes($relNs)['id'];

            if (isset($targets[$id])) {
                $this->sheets[(string) $sheet['name']] = $targets[$id];
            }
        }

        return $this->sheets;
    }

    /** @return list<string> */
    private function sharedStrings(): array
    {
        if ($this->sharedStrings !== null) {
            return $this->sharedStrings;
        }

        $this->sharedStrings = [];
        $xml = $this->open('xl/sharedStrings.xml', optional: true);

        if ($xml === null) {
            return $this->sharedStrings;
        }

        while ($xml->read() && ! ($xml->nodeType === XMLReader::ELEMENT && $xml->localName === 'si'));

        // Lompat antar-<si> bersaudara; isi tiap <si> diurai sekaligus.
        while ($xml->nodeType === XMLReader::ELEMENT && $xml->localName === 'si') {
            $node = $xml->expand();
            $this->sharedStrings[] = $node instanceof DOMElement ? self::text($node) : '';

            if (! $xml->next('si')) {
                break;
            }
        }

        $xml->close();

        return $this->sharedStrings;
    }

    /** @return ($optional is true ? XMLReader|null : XMLReader) */
    private function open(string $entry, bool $optional = false): ?XMLReader
    {
        $zip = new ZipArchive;
        $exists = $zip->open($this->path) === true && $zip->locateName($entry) !== false;
        $zip->close();

        if (! $exists) {
            if ($optional) {
                return null;
            }

            throw new RuntimeException("Bagian {$entry} tidak ada di file .xlsx.");
        }

        $xml = new XMLReader;

        if (! $xml->open('zip://'.str_replace('\\', '/', $this->path).'#'.$entry, null, LIBXML_NONET | LIBXML_COMPACT)) {
            throw new RuntimeException("Bagian {$entry} tidak dapat dibaca.");
        }

        return $xml;
    }
}
