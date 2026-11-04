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
     */
    public function __construct(
        public readonly string $sheet,
        public readonly int $headerRow,
        public readonly array $columns,
    ) {}

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

                $columns = CitizenImportColumns::map(array_map(fn (array $cell) => $cell['value'], $cells));

                if (CitizenImportColumns::isHeader($columns)) {
                    return new self($name, $row, $columns);
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

                    return new self($name, $row, $columns);
                }
            }

            $spreadsheet->disconnectWorksheets();
        }

        return null;
    }
}
