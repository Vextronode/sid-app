<?php

namespace App\Imports\Support;

use Maatwebsite\Excel\Excel as ExcelFormat;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\IReadFilter;

/**
 * Letak tabel warga di dalam file: sheet, baris header, dan kolom yang
 * dipakai. File pemutakhiran data pemilih punya banyak sheet (rekap, kode,
 * laporan) dan judul di atas tabel, jadi sheet pertama yang punya baris
 * header berisi NIK + nama dalam SCAN_ROWS baris awal yang dipakai.
 */
final class CitizenImportLayout
{
    /**
     * @param  array<string, string>  $columns  huruf kolom => field
     * @param  array<string, string>  $headers  huruf kolom => teks header asli (sel tidak kosong)
     */
    public function __construct(
        public readonly string $sheet,
        public readonly int $headerRow,
        public readonly array $columns,
        public readonly array $headers = [],
    ) {}

    /**
     * Kolom yang dibaca, yang diabaikan, dan kolom wajib yang tidak ada,
     * untuk ditampilkan di preview sebelum impor.
     *
     * @return array{sheet: string, header_row: int, mapped: list<array{column: string, header: string, field: string, label: string}>, ignored: list<array{column: string, header: string, reason: string, suggestion: string|null}>, missing_required: list<string>}
     */
    public function describe(): array
    {
        $mapped = [];
        $ignored = [];

        foreach ($this->headers as $column => $header) {
            $field = $this->columns[$column] ?? null;

            if ($field !== null) {
                $mapped[] = [
                    'column' => $column,
                    'header' => $header,
                    'field' => $field,
                    'label' => CitizenImportColumns::label($field),
                ];

                continue;
            }

            $duplicateOf = CitizenImportColumns::fieldOf($header);
            $ignored[] = [
                'column' => $column,
                'header' => $header,
                'reason' => $duplicateOf !== null
                    ? 'Kolom '.CitizenImportColumns::label($duplicateOf).' sudah diambil dari kolom '
                        .array_search($duplicateOf, $this->columns, true).'.'
                    : 'Tidak dikenali.',
                'suggestion' => $duplicateOf === null
                    ? CitizenImportColumns::suggest($header, array_values($this->columns))
                    : null,
            ];
        }

        return [
            'sheet' => $this->sheet,
            'header_row' => $this->headerRow,
            'mapped' => $mapped,
            'ignored' => $ignored,
            'missing_required' => CitizenImportColumns::missingRequired($this->columns),
        ];
    }

    /**
     * @param  array<string, mixed>  $cells  huruf kolom => isi sel header
     * @return array<string, string>
     */
    private static function headerTexts(array $cells): array
    {
        $headers = [];

        foreach ($cells as $column => $value) {
            $text = trim(explode("\n", str_replace("\r", '', (string) $value))[0]);

            if ($text !== '') {
                $headers[$column] = $text;
            }
        }

        return $headers;
    }

    /**
     * @param  string  $readerType  ExcelFormat::XLSX / XLS / CSV
     */
    public static function detect(string $path, string $readerType): ?self
    {
        return $readerType === ExcelFormat::XLSX
            ? self::detectXlsx(new XlsxStreamReader($path))
            : self::detectWithPhpSpreadsheet($path, $readerType);
    }

    /** Hanya SCAN_ROWS baris awal tiap sheet yang dibaca. */
    public static function detectXlsx(XlsxStreamReader $reader): ?self
    {
        foreach ($reader->sheetNames() as $name) {
            foreach ($reader->rows($name) as $row => $cells) {
                if ($row > CitizenImportColumns::SCAN_ROWS) {
                    break;
                }

                $values = array_map(fn (array $cell) => $cell['value'], $cells);
                $columns = CitizenImportColumns::map($values);

                if (CitizenImportColumns::isHeader($columns)) {
                    return new self($name, $row, $columns, self::headerTexts($values));
                }
            }
        }

        return null;
    }

    private static function detectWithPhpSpreadsheet(string $path, string $readerType): ?self
    {
        $reader = IOFactory::createReader($readerType);
        $reader->setReadDataOnly(true);
        $reader->setReadFilter(new class implements IReadFilter
        {
            public function readCell(string $columnAddress, int $row, string $worksheetName = ''): bool
            {
                return $row <= CitizenImportColumns::SCAN_ROWS;
            }
        });

        foreach ($reader->listWorksheetNames($path) as $name) {
            $reader->setLoadSheetsOnly([$name]);
            $spreadsheet = $reader->load($path);
            $sheet = $spreadsheet->getSheet(0);
            $lastColumn = Coordinate::columnIndexFromString($sheet->getHighestDataColumn());

            for ($row = 1; $row <= CitizenImportColumns::SCAN_ROWS; $row++) {
                $cells = [];

                for ($column = 1; $column <= $lastColumn; $column++) {
                    $letter = Coordinate::stringFromColumnIndex($column);
                    $cells[$letter] = $sheet->getCell($letter.$row)->getValue();
                }

                $columns = CitizenImportColumns::map($cells);

                if (CitizenImportColumns::isHeader($columns)) {
                    $spreadsheet->disconnectWorksheets();

                    return new self($name, $row, $columns, self::headerTexts($cells));
                }
            }

            $spreadsheet->disconnectWorksheets();
        }

        return null;
    }
}
