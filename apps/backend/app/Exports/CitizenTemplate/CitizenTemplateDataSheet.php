<?php

namespace App\Exports\CitizenTemplate;

use App\Exports\CitizensTemplateExport;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Sheet isian template impor warga: baris judul, satu baris contoh, dan
 * dropdown/format kolom sampai baris LAST_ROW supaya baris yang diketik
 * petugas ikut.
 */
final class CitizenTemplateDataSheet implements FromArray, WithColumnFormatting, WithColumnWidths, WithEvents, WithHeadings, WithTitle
{
    private const LAST_ROW = 5000;

    public function __construct(private readonly CitizenTemplateReference $reference) {}

    public function title(): string
    {
        return CitizensTemplateExport::DATA_SHEET;
    }

    /** @return list<string> */
    public function headings(): array
    {
        return CitizensTemplateExport::headings();
    }

    /** Baris contoh ditulis di AfterSheet supaya tipe selnya bisa diatur. */
    public function array(): array
    {
        return [];
    }

    /**
     * NIK, No. KK, RW, RT sebagai Teks (16 digit tidak dibulatkan, "001"
     * tidak jadi 1); kolom tanggal hari/bulan/tahun.
     *
     * @return array<string, string>
     */
    public function columnFormats(): array
    {
        $formats = [];

        foreach (CitizensTemplateExport::COLUMNS as $index => $column) {
            $letter = Coordinate::stringFromColumnIndex($index + 1);

            $format = match ($column['format']) {
                'text' => NumberFormat::FORMAT_TEXT,
                'date' => 'dd/mm/yyyy',
                default => null,
            };

            if ($format !== null) {
                $formats["{$letter}:{$letter}"] = $format;
            }
        }

        return $formats;
    }

    /** @return array<string, int> */
    public function columnWidths(): array
    {
        $widths = [];

        foreach (CitizensTemplateExport::COLUMNS as $index => $column) {
            $widths[Coordinate::stringFromColumnIndex($index + 1)] = max(14, strlen($column['header']) + 6);
        }

        return $widths;
    }

    /** @return array<class-string, callable> */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastColumn = Coordinate::stringFromColumnIndex(count(CitizensTemplateExport::COLUMNS));

                $sheet->freezePane('B2');
                $sheet->getStyle("A1:{$lastColumn}1")->getFont()->setBold(true);
                $sheet->getStyle("A1:{$lastColumn}1")->getFill()
                    ->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('E8EEF7');

                foreach (CitizensTemplateExport::COLUMNS as $index => $column) {
                    $letter = Coordinate::stringFromColumnIndex($index + 1);

                    if ($column['required']) {
                        $sheet->getStyle("{$letter}1")->getFill()->getStartColor()->setRGB('FCE4D6');
                    }

                    $validation = $this->validation($column);
                    if ($validation !== null) {
                        $sheet->setDataValidation("{$letter}2:{$letter}".self::LAST_ROW, $validation);
                    }
                }

                $this->writeExample($sheet, $lastColumn);
            },
        ];
    }

    /**
     * Pilihan tetap sistem: ketat (isian lain ditolak Excel). Daftar dari
     * data desa: peringatan, karena dusun/RW/RT/pekerjaan bisa bertambah di
     * sistem setelah template diunduh; isian baru tetap boleh dan dicocokkan
     * server ke database terbaru saat impor.
     *
     * @param  array{header: string, choices: list<string>|string|null}  $column
     */
    private function validation(array $column): ?DataValidation
    {
        $choices = $column['choices'];

        if ($choices === null) {
            return null;
        }

        if (is_array($choices)) {
            return $this->dropdown('"'.implode(',', $choices).'"', DataValidation::STYLE_STOP)
                ->setErrorTitle($column['header'])
                ->setError('Pilih salah satu isian dari daftar.');
        }

        $formula = $choices === 'rts'
            ? 'INDIRECT("RW_"&$'.CitizensTemplateExport::columnOf('RW').'2)'
            : CitizenTemplateListSheet::listFormula($this->reference, $choices);

        if ($formula === null) {
            return null;
        }

        return $this->dropdown($formula, DataValidation::STYLE_WARNING)
            ->setErrorTitle($column['header'])
            ->setError('Tidak ada di daftar template ini. Bila data ini baru ditambahkan di sistem, pilih Yes untuk tetap memakainya; sistem mencocokkannya saat impor.');
    }

    private function dropdown(string $formula, string $style): DataValidation
    {
        return (new DataValidation)
            ->setType(DataValidation::TYPE_LIST)
            ->setErrorStyle($style)
            ->setAllowBlank(true)
            ->setShowDropDown(true)
            ->setShowErrorMessage(true)
            ->setFormula1($formula);
    }

    /**
     * Baris 2: contoh isian dengan NIK khusus yang selalu dilewati impor,
     * memakai wilayah dan pekerjaan yang benar-benar ada di desa ini.
     */
    private function writeExample(Worksheet $sheet, string $lastColumn): void
    {
        $region = $this->reference->exampleRegion();
        $overrides = [
            'DUSUN' => $region['hamlet'] ?? '',
            'RW' => $region['rw'] ?? '',
            'RT' => $region['rt'] ?? '',
            'PEKERJAAN' => $this->reference->occupations[0] ?? '',
        ];

        foreach (CitizensTemplateExport::COLUMNS as $index => $column) {
            $value = $overrides[$column['header']] ?? $column['example'];
            if ($value === '') {
                continue;
            }

            $cell = $sheet->getCell(Coordinate::stringFromColumnIndex($index + 1).'2');

            $column['format'] === 'date'
                ? $cell->setValueExplicit(ExcelDate::PHPToExcel(new \DateTimeImmutable($value)), DataType::TYPE_NUMERIC)
                : $cell->setValueExplicit($value, DataType::TYPE_STRING);
        }

        $sheet->getStyle("A2:{$lastColumn}2")->getFont()->setItalic(true)->getColor()->setRGB('808080');
        $sheet->getComment('A2')->getText()->createTextRun(
            'Baris contoh. Boleh dihapus atau dibiarkan: baris dengan NIK ini selalu dilewati saat impor.',
        );
    }
}
