<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadings;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DefaultValueBinder;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

/**
 * Template impor warga (UC-09). Header harus persis sama dengan key yang
 * divalidasi CitizensImport::rules() (WithHeadingRow, snake_case); satu
 * baris contoh membantu petugas melihat format isian.
 *
 * Kolom NIK berformat Teks: Excel menyimpan angka hanya sampai 15 digit
 * signifikan, sehingga NIK 16 digit yang diketik di sel Angka berubah
 * digit terakhirnya menjadi 0 tanpa terlihat.
 */
class CitizensTemplateExport extends DefaultValueBinder implements FromArray, ShouldAutoSize, WithColumnFormatting, WithCustomValueBinder, WithHeadings
{
    public const HEADINGS = [
        'nik',
        'name',
        'date_of_birth',
        'place_of_birth',
        'gender',
        'blood_type',
        'address',
        'rt_id',
        'hamlet_id',
        'family_id',
        'family_role',
        'father_id',
        'mother_id',
        'father_name_text',
        'mother_name_text',
        'marital_status',
        'religion',
        'last_education',
        'domicile_status',
        'current_domicile',
        'residency_type',
        'origin_region',
        'title_front',
        'title_back',
        'birth_certificate_number',
        'marriage_certificate_number',
        'marriage_date',
        'divorce_certificate_number',
        'divorce_date',
        'has_disorder',
        'disability',
    ];

    /**
     * @return list<string>
     */
    public function headings(): array
    {
        return self::HEADINGS;
    }

    /** Huruf kolom NIK di template (mis. "A"). */
    public static function nikColumn(): string
    {
        return Coordinate::stringFromColumnIndex((int) array_search('nik', self::HEADINGS, true) + 1);
    }

    /**
     * Seluruh kolom (`A:A`), bukan hanya sel contoh, supaya baris yang
     * diketik petugas juga bertipe Teks.
     *
     * @return array<string, string>
     */
    public function columnFormats(): array
    {
        $column = self::nikColumn();

        return ["{$column}:{$column}" => NumberFormat::FORMAT_TEXT];
    }

    /**
     * Contoh NIK juga ditulis sebagai teks; tanpa ini PhpSpreadsheet
     * menyimpannya sebagai angka.
     */
    public function bindValue(Cell $cell, mixed $value): bool
    {
        if ($cell->getColumn() === self::nikColumn() && $cell->getRow() > 1) {
            $cell->setValueExplicit((string) $value, DataType::TYPE_STRING);

            return true;
        }

        return parent::bindValue($cell, $value);
    }

    /**
     * @return list<list<string>>
     */
    public function array(): array
    {
        return [[
            '3201010101900001',
            'Contoh Nama Warga',
            '1990-01-01',
            'Pangandaran',
            'L',
            'O',
            'Jl. Contoh No. 1',
            '1',
            '',
            '',
            'kepala_keluarga',
            '',
            '',
            'Nama Ayah',
            'Nama Ibu',
            'kawin',
            'islam',
            'sma',
            'menetap',
            '',
            'lokal',
            '',
            '',
            'S.Pd.',
            '3207-LT-01011990-0001',
            '123/45/X/2015',
            '2015-10-10',
            '',
            '',
            '0',
            '',
        ]];
    }
}
