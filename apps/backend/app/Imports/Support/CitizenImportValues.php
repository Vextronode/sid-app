<?php

namespace App\Imports\Support;

use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

/**
 * Menyeragamkan isi sel sebelum divalidasi CitizensImport. Pilihan (agama,
 * pendidikan, SHDK, ...) diterima sebagai nilai sistem ("islam"), label
 * Dukcapil ("SLTA/SEDERAJAT"), atau kode angka SIAK/KPU.
 *
 * Isi pilihan opsional yang tidak dikenali (mis. agama "KEPERCAYAAN")
 * dikosongkan dan dicatat di $warnings; barisnya tetap diimpor. Isi wajib
 * (jenis kelamin, tanggal lahir) yang tidak dikenali dibiarkan apa adanya
 * supaya validasi menolak baris itu dengan pesan yang jelas.
 */
final class CitizenImportValues
{
    private const DATE_FIELDS = ['date_of_birth', 'marriage_date', 'divorce_date'];

    /** Isi sel yang berarti kosong. */
    private const EMPTY_VALUES = ['-', '--', '.'];

    private const GENDERS = [
        'L' => 'L', 'LAKI LAKI' => 'L', 'LAKI' => 'L', 'PRIA' => 'L', 'M' => 'L', 'MALE' => 'L',
        'P' => 'P', 'PEREMPUAN' => 'P', 'WANITA' => 'P', 'F' => 'P', 'FEMALE' => 'P',
    ];

    /** Kode jenis kelamin SIAK. */
    private const GENDER_CODES = [1 => 'L', 2 => 'P'];

    /** Kode jenis disabilitas pada data pemilih KPU; 0 = bukan penyandang. */
    private const DISABILITY_CODES = [
        1 => 'Disabilitas Fisik',
        2 => 'Disabilitas Intelektual',
        3 => 'Disabilitas Mental',
        4 => 'Disabilitas Sensorik Wicara',
        5 => 'Disabilitas Sensorik Rungu',
        6 => 'Disabilitas Sensorik Netra',
    ];

    private const NO_DISABILITY = ['TIDAK', 'TIDAK ADA', 'NORMAL', 'BUKAN', 'TIDAK CACAT'];

    /**
     * Pilihan opsional: field => [label kolom, label => nilai, kode => nilai].
     * Label ditulis dalam bentuk ternormalisasi (key()); nilai sistem
     * ("kepala_keluarga" -> "KEPALA KELUARGA") selalu diterima.
     *
     * Status kawin "P" (pernah kawin, file pemilih) tidak membedakan cerai
     * hidup dan cerai mati, jadi dikosongkan tanpa peringatan.
     */
    private const CHOICES = [
        'religion' => ['Agama', [
            'ISLAM' => 'islam',
            'KRISTEN' => 'kristen', 'PROTESTAN' => 'kristen', 'KRISTEN PROTESTAN' => 'kristen',
            'KATOLIK' => 'katolik', 'KATHOLIK' => 'katolik', 'KRISTEN KATOLIK' => 'katolik',
            'HINDU' => 'hindu',
            'BUDHA' => 'buddha', 'BUDDHA' => 'buddha',
            'KONGHUCU' => 'konghucu', 'KHONGHUCU' => 'konghucu', 'KONG HU CU' => 'konghucu',
        ], [1 => 'islam', 2 => 'kristen', 3 => 'katolik', 4 => 'hindu', 5 => 'buddha', 6 => 'konghucu']],

        'last_education' => ['Pendidikan', [
            'TIDAK SEKOLAH' => 'tidak_sekolah', 'BELUM SEKOLAH' => 'tidak_sekolah',
            'TIDAK BELUM SEKOLAH' => 'tidak_sekolah', 'TIDAK SEKOLAH BELUM SEKOLAH' => 'tidak_sekolah',
            // Sistem tidak punya jenjang "belum tamat SD".
            'BELUM TAMAT SD' => 'tidak_sekolah', 'BELUM TAMAT SD SEDERAJAT' => 'tidak_sekolah',
            'SD' => 'sd', 'MI' => 'sd', 'TAMAT SD' => 'sd', 'SD SEDERAJAT' => 'sd', 'TAMAT SD SEDERAJAT' => 'sd',
            'SMP' => 'smp', 'SLTP' => 'smp', 'MTS' => 'smp', 'SMP SEDERAJAT' => 'smp', 'SLTP SEDERAJAT' => 'smp',
            'SMA' => 'sma', 'SMK' => 'sma', 'SLTA' => 'sma', 'MA' => 'sma', 'STM' => 'sma',
            'SMA SEDERAJAT' => 'sma', 'SLTA SEDERAJAT' => 'sma',
            'DIPLOMA' => 'diploma', 'D1' => 'diploma', 'D2' => 'diploma', 'D3' => 'diploma',
            'DIPLOMA I' => 'diploma', 'DIPLOMA II' => 'diploma', 'DIPLOMA III' => 'diploma', 'DIPLOMA I II' => 'diploma',
            'AKADEMI' => 'diploma', 'SARJANA MUDA' => 'diploma',
            'AKADEMI DIPLOMA III SARJANA MUDA' => 'diploma', 'AKADEMI DIPLOMA III S MUDA' => 'diploma',
            'S1' => 's1', 'D4' => 's1', 'SARJANA' => 's1', 'STRATA I' => 's1', 'DIPLOMA IV' => 's1',
            'DIPLOMA IV STRATA I' => 's1',
            'S2' => 's2', 'STRATA II' => 's2', 'MAGISTER' => 's2',
            'S3' => 's3', 'STRATA III' => 's3', 'DOKTOR' => 's3',
        ], [
            1 => 'tidak_sekolah', 2 => 'tidak_sekolah', 3 => 'sd', 4 => 'smp', 5 => 'sma',
            6 => 'diploma', 7 => 'diploma', 8 => 's1', 9 => 's2', 10 => 's3',
        ]],

        'marital_status' => ['Status kawin', [
            'B' => 'belum_kawin', 'S' => 'kawin', 'P' => null,
            'BELUM KAWIN' => 'belum_kawin', 'BELUM MENIKAH' => 'belum_kawin',
            'KAWIN' => 'kawin', 'MENIKAH' => 'kawin', 'KAWIN TERCATAT' => 'kawin',
            'KAWIN BELUM TERCATAT' => 'kawin_belum_tercatat',
            'CERAI HIDUP' => 'cerai_hidup', 'CERAI HIDUP TERCATAT' => 'cerai_hidup',
            'CERAI HIDUP BELUM TERCATAT' => 'cerai_hidup_belum_tercatat',
            'CERAI MATI' => 'cerai_mati',
        ], [1 => 'belum_kawin', 2 => 'kawin', 3 => 'cerai_hidup', 4 => 'cerai_mati']],

        'family_role' => ['SHDK', [
            'KEPALA KELUARGA' => 'kepala_keluarga', 'KK' => 'kepala_keluarga',
            'SUAMI' => 'suami', 'ISTRI' => 'istri', 'ISTERI' => 'istri', 'ANAK' => 'anak',
            'MENANTU' => 'menantu', 'CUCU' => 'cucu',
            'ORANG TUA' => 'orang_tua', 'ORANGTUA' => 'orang_tua', 'MERTUA' => 'mertua',
            'FAMILI LAIN' => 'famili_lain', 'FAMILY LAIN' => 'famili_lain',
            'PEMBANTU' => 'pembantu', 'LAINNYA' => 'lainnya',
        ], [
            1 => 'kepala_keluarga', 2 => 'suami', 3 => 'istri', 4 => 'anak', 5 => 'menantu', 6 => 'cucu',
            7 => 'orang_tua', 8 => 'mertua', 9 => 'famili_lain', 10 => 'pembantu', 11 => 'lainnya',
        ]],

        'blood_type' => ['Golongan darah', [
            'A' => 'A', 'B' => 'B', 'AB' => 'AB', 'O' => 'O',
            'TIDAK TAHU' => 'tidak_tahu', 'TIDAK DIKETAHUI' => 'tidak_tahu',
        ], [
            1 => 'A', 2 => 'B', 3 => 'AB', 4 => 'O', 5 => 'A', 6 => 'A', 7 => 'B', 8 => 'B',
            9 => 'AB', 10 => 'AB', 11 => 'O', 12 => 'O', 13 => 'tidak_tahu',
        ]],

        'domicile_status' => ['Status domisili', [
            'MENETAP' => 'menetap',
            'MERANTAU' => 'merantau_dalam_negeri', 'MERANTAU DALAM NEGERI' => 'merantau_dalam_negeri',
            'MERANTAU LUAR NEGERI' => 'merantau_luar_negeri',
            'TKI' => 'tki', 'PMI' => 'tki', 'TKW' => 'tki',
        ], []],

        'residency_type' => ['Jenis penduduk', [
            'LOKAL' => 'lokal', 'ASLI' => 'lokal', 'TETAP' => 'lokal', 'PENDUDUK TETAP' => 'lokal',
            'PENDATANG' => 'pendatang',
        ], []],
    ];

    /**
     * @param  array<string, mixed>  $data  field => isi sel
     * @param  list<string>  $warnings  pesan untuk isi yang dikosongkan
     * @return array<string, mixed>
     */
    public static function normalize(array $data, array &$warnings = []): array
    {
        foreach ($data as $field => $value) {
            if (is_string($value)) {
                $value = trim($value);
            }

            $data[$field] = $value === '' || in_array($value, self::EMPTY_VALUES, true) ? null : $value;
        }

        foreach (self::DATE_FIELDS as $field) {
            if (isset($data[$field])) {
                $data[$field] = self::date($data[$field]);
            }
        }

        if (isset($data['gender'])) {
            $data['gender'] = is_numeric($data['gender'])
                ? self::GENDER_CODES[(int) $data['gender']] ?? $data['gender']
                : self::GENDERS[self::key($data['gender'])] ?? $data['gender'];
        }

        foreach (self::CHOICES as $field => [$label, $labels, $codes]) {
            if (isset($data[$field])) {
                $data[$field] = self::choice($data[$field], $labels, $codes, $label, $warnings);
            }
        }

        // Kolom AYAH/IBU kadang berisi NIK, bukan nama.
        foreach (['father_name_text' => 'Nama ayah', 'mother_name_text' => 'Nama ibu'] as $field => $label) {
            if (isset($data[$field]) && preg_match('/^\d{15,16}$/', self::digits($data[$field])) === 1) {
                $warnings[] = "{$label} berisi angka seperti NIK, bukan nama; kolom ini dikosongkan.";
                $data[$field] = null;
            }
        }

        if (isset($data['place_of_birth'])) {
            $data['place_of_birth'] = rtrim((string) $data['place_of_birth'], ' .,') ?: null;
        }

        if (array_key_exists('disability', $data)) {
            $data = self::disability($data);
        }

        return $data;
    }

    /**
     * "SLTA/Sederajat" -> "SLTA SEDERAJAT", "kepala_keluarga" ->
     * "KEPALA KELUARGA", "A+" -> "A" (rhesus tidak disimpan).
     */
    private static function key(mixed $value): string
    {
        $upper = strtoupper((string) $value);
        $upper = (string) preg_replace('/(?<=[ABO])\s*(\+|-|POS(ITIF)?|NEG(ATIF)?|RH\S*)$/', '', $upper);

        return trim((string) preg_replace('/[^A-Z0-9]+/', ' ', $upper));
    }

    /**
     * @param  array<string, string|null>  $labels
     * @param  array<int, string>  $codes
     * @param  list<string>  $warnings
     */
    private static function choice(mixed $value, array $labels, array $codes, string $label, array &$warnings): ?string
    {
        if (is_numeric($value) && (float) $value === (float) (int) $value) {
            if (array_key_exists((int) $value, $codes)) {
                return $codes[(int) $value];
            }
        } else {
            $key = self::key($value);

            if (array_key_exists($key, $labels)) {
                return $labels[$key];
            }

            // Nilai sistem apa adanya, mis. "kawin_belum_tercatat".
            $systemValue = strtolower(str_replace(' ', '_', $key));
            if (in_array($systemValue, $labels, true)) {
                return $systemValue;
            }
        }

        $warnings[] = "{$label} \"{$value}\" tidak dikenali; kolom ini dikosongkan.";

        return null;
    }

    /** Angka besar dari sel Angka (3.2010123456700E+15) ditulis utuh. */
    private static function digits(mixed $value): string
    {
        return is_float($value) ? sprintf('%.0f', $value) : trim((string) $value);
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

    /**
     * Kode angka KPU diubah ke label; teks lain (template sistem, buku
     * induk) disimpan apa adanya. Keduanya menandai has_disorder. 0 atau
     * "TIDAK" berarti tidak ada kelainan.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private static function disability(array $data): array
    {
        $value = $data['disability'];

        if ($value === null) {
            return $data;
        }

        if (is_numeric($value)) {
            $data['disability'] = self::DISABILITY_CODES[(int) $value] ?? null;
        } elseif (in_array(self::key($value), self::NO_DISABILITY, true)) {
            $data['disability'] = null;
        }

        if ($data['disability'] !== null) {
            $data['has_disorder'] ??= true;
        }

        return $data;
    }
}
