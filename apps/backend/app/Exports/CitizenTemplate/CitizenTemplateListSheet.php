<?php

namespace App\Exports\CitizenTemplate;

use App\Exports\CitizensTemplateExport;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DefaultValueBinder;
use PhpOffice\PhpSpreadsheet\NamedRange;
use PhpOffice\PhpSpreadsheet\Style\Fill;

/**
 * Sheet "Daftar Pilihan": acuan wilayah (Dusun - RW - RT) dan pekerjaan
 * aktif desa per tanggal unduh, sekaligus sumber dropdown sheet Data Warga.
 * Tiap RW punya named range (RW_003, ...) berisi RT-nya untuk dropdown RT
 * yang mengikuti RW. Tidak dibaca impor (tidak punya judul NIK + nama).
 */
final class CitizenTemplateListSheet extends DefaultValueBinder implements FromArray, WithCustomValueBinder, WithEvents, WithTitle
{
    /** Baris judul tabel; data mulai baris berikutnya. */
    public const HEADER_ROW = 3;

    /** Kolom daftar dropdown. */
    public const HAMLET_COLUMN = 'E';

    public const RW_COLUMN = 'F';

    public const OCCUPATION_COLUMN = 'G';

    /** Kolom pertama daftar RT per RW (satu kolom per RW). */
    private const FIRST_RT_COLUMN = 9; // I

    public function __construct(private readonly CitizenTemplateReference $reference) {}

    public function title(): string
    {
        return CitizensTemplateExport::LIST_SHEET;
    }

    /** Rumus sumber dropdown untuk satu daftar, atau null bila kosong. */
    public static function listFormula(CitizenTemplateReference $reference, string $list): ?string
    {
        [$column, $count] = match ($list) {
            'hamlets' => [self::HAMLET_COLUMN, count($reference->hamlets)],
            'rws' => [self::RW_COLUMN, count($reference->rws)],
            'occupations' => [self::OCCUPATION_COLUMN, count($reference->occupations)],
        };

        if ($count === 0) {
            return null;
        }

        $first = self::HEADER_ROW + 1;
        $last = self::HEADER_ROW + $count;

        return "'".CitizensTemplateExport::LIST_SHEET."'!\${$column}\${$first}:\${$column}\${$last}";
    }

    /** @return list<list<string>> */
    public function array(): array
    {
        $reference = $this->reference;
        $rwColumns = array_keys($reference->rtsByRw);

        $regions = [];
        foreach ($reference->rws as $rw) {
            foreach ($reference->rtsByRw[$rw['number']] ?? [] as $rt) {
                $regions[] = [$rw['hamlet'] ?? '-', $rw['number'], $rt];
            }
        }

        $header = ['Dusun', 'RW', 'RT', '', 'Daftar Dusun', 'Daftar RW', 'Daftar Pekerjaan', ''];
        foreach ($rwColumns as $rwNumber) {
            $header[] = "RT di RW {$rwNumber}";
        }

        $rows = [
            ['Daftar wilayah dan pekerjaan per '.$reference->generatedAt->format('d/m/Y H:i')
                .'. Bila ada dusun, RW, RT, atau pekerjaan baru di sistem, unduh ulang template.'],
            [''],
            $header,
        ];

        $height = max(
            count($regions),
            count($reference->hamlets),
            count($reference->rws),
            count($reference->occupations),
            ...array_map('count', array_values($reference->rtsByRw) ?: [[]]),
        );

        for ($i = 0; $i < $height; $i++) {
            $row = [
                $regions[$i][0] ?? '', $regions[$i][1] ?? '', $regions[$i][2] ?? '', '',
                $reference->hamlets[$i] ?? '', $reference->rws[$i]['number'] ?? '', $reference->occupations[$i] ?? '', '',
            ];

            foreach ($rwColumns as $rwNumber) {
                $row[] = $reference->rtsByRw[$rwNumber][$i] ?? '';
            }

            $rows[] = $row;
        }

        return $rows;
    }

    /** Nomor RW/RT ("003") tetap teks, tidak jadi angka 3. */
    public function bindValue(Cell $cell, mixed $value): bool
    {
        $cell->setValueExplicit((string) $value, DataType::TYPE_STRING);

        return true;
    }

    /** @return array<class-string, callable> */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $spreadsheet = $sheet->getParent();
                $lastColumn = Coordinate::stringFromColumnIndex(self::FIRST_RT_COLUMN - 1 + count($this->reference->rtsByRw));

                $sheet->getStyle('A1')->getFont()->setBold(true);
                $headerRange = 'A'.self::HEADER_ROW.":{$lastColumn}".self::HEADER_ROW;
                $sheet->getStyle($headerRange)->getFont()->setBold(true);
                $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('E8EEF7');
                $sheet->freezePane('A'.(self::HEADER_ROW + 1));

                foreach (['A' => 18, 'B' => 8, 'C' => 8, 'D' => 3, 'E' => 18, 'F' => 10, 'G' => 28, 'H' => 3] as $column => $width) {
                    $sheet->getColumnDimension($column)->setWidth($width);
                }

                $column = self::FIRST_RT_COLUMN;
                foreach ($this->reference->rtsByRw as $rwNumber => $rts) {
                    $letter = Coordinate::stringFromColumnIndex($column++);
                    $sheet->getColumnDimension($letter)->setWidth(12);

                    if ($rts === []) {
                        continue;
                    }

                    $first = self::HEADER_ROW + 1;
                    $last = self::HEADER_ROW + count($rts);
                    $spreadsheet->addNamedRange(new NamedRange(
                        CitizenTemplateReference::rtRangeName((string) $rwNumber),
                        $sheet,
                        "\${$letter}\${$first}:\${$letter}\${$last}",
                    ));
                }
            },
        ];
    }
}
