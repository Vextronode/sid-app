<?php

namespace App\Services;

use App\Models\Letter;
use App\Repositories\LetterNumberCounterRepository;

class LetterNumberGenerator
{
    private const ROMAN_MONTHS = [
        1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV', 5 => 'V', 6 => 'VI',
        7 => 'VII', 8 => 'VIII', 9 => 'IX', 10 => 'X', 11 => 'XI', 12 => 'XII',
    ];

    private const DEFAULT_CLASSIFICATION_CODE = '470';

    public function __construct(
        protected LetterNumberCounterRepository $counterRepository,
    ) {}

    /**
     * Format kantor desa: {kode klasifikasi}/{nomor urut}/Des/{bulan
     * Romawi}/{tahun}, mis. 470/001/Des/X/2026. Nomor urut dihitung per
     * desa, kode klasifikasi, dan tahun, karena beberapa jenis surat
     * berbagi kode klasifikasi yang sama.
     */
    public function next(Letter $letter): string
    {
        $letter->loadMissing('letterType');

        $now = now();
        $classification = $letter->letterType->classification_code ?: self::DEFAULT_CLASSIFICATION_CODE;

        $number = $this->counterRepository->nextNumber(
            $letter->village_id,
            $classification,
            $now->year,
        );

        return sprintf(
            '%s/%03d/Des/%s/%d',
            $classification,
            $number,
            self::ROMAN_MONTHS[$now->month],
            $now->year,
        );
    }
}
