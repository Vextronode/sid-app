<?php

namespace App\Imports\Support;

use App\Exports\CitizensTemplateExport;

/**
 * Pemetaan header kolom file impor ke field warga. Menerima dua bentuk:
 * header template sistem (snake_case, CitizensTemplateExport::HEADINGS) dan
 * header file pemutakhiran data pemilih yang dipakai desa (NIK, NAMA,
 * TEMPAT LAHIR, STS KAWIN, ...). Kolom yang tidak dikenal diabaikan.
 *
 * `no_kk`, `rt`, dan `rw` bukan field warga: dipakai CitizenImportResolver
 * untuk mencari/membuat KK dan menurunkan rt_id.
 */
final class CitizenImportColumns
{
    /** Header dicari di baris-baris awal; file desa punya judul di atas tabel. */
    public const SCAN_ROWS = 20;

    /** @var array<string, list<string>> field => header ternormalisasi */
    private const ALIASES = [
        'nik' => ['NIK'],
        'no_kk' => ['NKK', 'NO KK', 'NOMOR KK', 'NO_KK', 'NOMOR KARTU KELUARGA'],
        'name' => ['NAMA', 'NAMA LENGKAP'],
        'place_of_birth' => ['TEMPAT LAHIR'],
        'date_of_birth' => ['TANGGAL LAHIR', 'TGL LAHIR'],
        'gender' => ['JENIS KELAMIN', 'KELAMIN', 'JK'],
        'marital_status' => ['STS KAWIN', 'STATUS KAWIN', 'STATUS PERKAWINAN'],
        'address' => ['ALAMAT'],
        'rt' => ['RT'],
        'rw' => ['RW'],
        'disability' => ['DISABILITAS'],
    ];

    /**
     * "STS KAWIN\nB/S/P" -> "STS KAWIN": keterangan di baris kedua sel
     * header dibuang, tanda baca jadi spasi, huruf besar.
     */
    public static function normalizeHeader(mixed $value): string
    {
        $firstLine = explode("\n", str_replace("\r", '', (string) $value))[0];
        $clean = preg_replace('/[^A-Z0-9_ ]+/', ' ', strtoupper($firstLine));

        return trim((string) preg_replace('/\s+/', ' ', (string) $clean));
    }

    /**
     * Petakan satu baris header. Kolom pertama yang cocok yang dipakai bila
     * satu field muncul dua kali.
     *
     * @param  array<string, mixed>  $cells  huruf kolom => isi sel
     * @return array<string, string> huruf kolom => field
     */
    public static function map(array $cells): array
    {
        $lookup = self::lookup();
        $columns = [];

        foreach ($cells as $column => $value) {
            $field = $lookup[self::normalizeHeader($value)] ?? null;

            if ($field !== null && ! in_array($field, $columns, true)) {
                $columns[$column] = $field;
            }
        }

        return $columns;
    }

    /** Baris header sah bila minimal memuat NIK dan nama. */
    public static function isHeader(array $columns): bool
    {
        return in_array('nik', $columns, true) && in_array('name', $columns, true);
    }

    /** @return array<string, string> header ternormalisasi => field */
    private static function lookup(): array
    {
        static $lookup = null;

        if ($lookup === null) {
            $lookup = [];

            foreach (CitizensTemplateExport::HEADINGS as $heading) {
                $lookup[self::normalizeHeader($heading)] = $heading;
            }

            foreach (self::ALIASES as $field => $aliases) {
                foreach ($aliases as $alias) {
                    $lookup[$alias] = $field;
                }
            }
        }

        return $lookup;
    }
}
