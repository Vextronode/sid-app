<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;

/**
 * Template impor warga (UC-09). Header harus persis sama dengan key yang
 * divalidasi CitizensImport::rules() (WithHeadingRow, snake_case); satu
 * baris contoh membantu petugas melihat format isian.
 */
class CitizensTemplateExport implements FromArray, ShouldAutoSize, WithHeadings
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
    ];

    /**
     * @return list<string>
     */
    public function headings(): array
    {
        return self::HEADINGS;
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
        ]];
    }
}
