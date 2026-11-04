<?php

namespace App\Imports\Support;

use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

/**
 * Menyeragamkan isi sel sebelum divalidasi CitizensImport. Nilai yang tidak
 * dikenali dibiarkan apa adanya supaya validasi menolaknya dengan pesan
 * yang jelas, kecuali status kawin "P" (lihat MARITAL_CODES).
 */
final class CitizenImportValues
{
    private const DATE_FIELDS = ['date_of_birth', 'marriage_date', 'divorce_date'];

    /**
     * Kode STS KAWIN file pemilih. "P" (pernah kawin) tidak membedakan cerai
     * hidup dan cerai mati, jadi dikosongkan untuk dilengkapi petugas.
     */
    private const MARITAL_CODES = ['b' => 'belum_kawin', 's' => 'kawin', 'p' => null];

    private const GENDERS = [
        'L' => 'L', 'LAKI-LAKI' => 'L', 'LAKI LAKI' => 'L', 'PRIA' => 'L',
        'P' => 'P', 'PEREMPUAN' => 'P', 'WANITA' => 'P',
    ];

    /** Kode jenis disabilitas pada data pemilih KPU; 0 = bukan penyandang. */
    private const DISABILITY_CODES = [
        1 => 'Disabilitas Fisik',
        2 => 'Disabilitas Intelektual',
        3 => 'Disabilitas Mental',
        4 => 'Disabilitas Sensorik Wicara',
        5 => 'Disabilitas Sensorik Rungu',
        6 => 'Disabilitas Sensorik Netra',
    ];

    /**
     * @param  array<string, mixed>  $data  field => isi sel
     * @return array<string, mixed>
     */
    public static function normalize(array $data): array
    {
        foreach ($data as $field => $value) {
            if (is_string($value)) {
                $value = trim($value);
            }

            $data[$field] = $value === '' ? null : $value;
        }

        foreach (self::DATE_FIELDS as $field) {
            if (isset($data[$field])) {
                $data[$field] = self::date($data[$field]);
            }
        }

        if (isset($data['gender'])) {
            $data['gender'] = self::GENDERS[strtoupper((string) $data['gender'])] ?? $data['gender'];
        }

        if (isset($data['marital_status'])) {
            $data['marital_status'] = self::maritalStatus((string) $data['marital_status']);
        }

        if (isset($data['place_of_birth'])) {
            $data['place_of_birth'] = rtrim((string) $data['place_of_birth'], ' .,') ?: null;
        }

        if (array_key_exists('disability', $data)) {
            $data = self::disability($data);
        }

        return $data;
    }

    /** "10|01|1993", "10/01/1993", atau tanggal Excel -> "1993-01-10". */
    private static function date(mixed $value): mixed
    {
        if (is_int($value) || is_float($value)) {
            return ExcelDate::excelToDateTimeObject($value)->format('Y-m-d');
        }

        if (preg_match('/^(\d{1,2})[|\/.\-](\d{1,2})[|\/.\-](\d{4})$/', (string) $value, $m)
            && checkdate((int) $m[2], (int) $m[1], (int) $m[3])) {
            return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
        }

        return $value;
    }

    private static function maritalStatus(string $value): ?string
    {
        $key = strtolower($value);

        if (array_key_exists($key, self::MARITAL_CODES)) {
            return self::MARITAL_CODES[$key];
        }

        // "Belum Kawin" / "Cerai Hidup" -> belum_kawin / cerai_hidup.
        return str_replace([' ', '-'], '_', $key);
    }

    /**
     * Kode angka KPU diubah ke label dan menandai has_disorder; 0 berarti
     * tidak ada kelainan. Teks bebas (template sistem) dibiarkan.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private static function disability(array $data): array
    {
        $value = $data['disability'];

        if (! is_numeric($value)) {
            return $data;
        }

        $code = (int) $value;
        $data['disability'] = self::DISABILITY_CODES[$code] ?? null;

        if ($data['disability'] !== null) {
            $data['has_disorder'] ??= true;
        }

        return $data;
    }
}
