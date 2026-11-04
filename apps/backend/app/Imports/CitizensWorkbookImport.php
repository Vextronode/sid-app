<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\Import;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

/**
 * Hanya sheet berisi tabel warga yang dimuat; sheet lain (rekap, laporan,
 * kode) di file pemutakhiran data pemilih bisa sangat besar.
 */
class CitizensWorkbookImport implements Import, WithMultipleSheets
{
    public function __construct(
        private readonly string $sheet,
        private readonly CitizensImport $import,
    ) {}

    /**
     * @return array<string, CitizensImport>
     */
    public function sheets(): array
    {
        return [$this->sheet => $this->import];
    }
}
