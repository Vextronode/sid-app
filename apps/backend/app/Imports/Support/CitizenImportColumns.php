<?php

namespace App\Imports\Support;

use App\Exports\CitizensTemplateExport;

/**
 * Pemetaan header kolom file impor ke field warga. Menerima header template
 * sistem (snake_case, CitizensTemplateExport::HEADINGS) dan header yang umum
 * di file desa: data pemilih (NIK, NAMA, STS KAWIN, ...), buku induk, dan
 * biodata Dukcapil (AGAMA, PENDIDIKAN, SHDK, ...). Kolom yang tidak dikenal
 * diabaikan.
 *
 * Header dicocokkan persis setelah dinormalisasi, bukan dengan kemiripan,
 * supaya "NAMA IBU" tidak terbaca sebagai nama warga. Header "KK" sengaja
 * tidak dikenali: bisa berarti Kartu Keluarga atau Kepala Keluarga.
 *
 * Kolom bantu yang bukan field warga, dipakai CitizenImportResolver:
 * `no_kk` (cari/buat KK), `rt`/`rw`/`rt_rw` (nomor RT/RW -> rt_id), dan
 * `hamlet` (nama dusun -> hamlet_id).
 */
final class CitizenImportColumns
{
    /** Header dicari di baris-baris awal; file desa punya judul di atas tabel. */
    public const SCAN_ROWS = 20;

    /** @var array<string, list<string>> field => header ternormalisasi */
    private const ALIASES = [
        // Identitas
        'nik' => ['NIK', 'NOMOR INDUK KEPENDUDUKAN', 'NO NIK'],
        'no_kk' => ['NKK', 'NO KK', 'NOMOR KK', 'NOMOR KARTU KELUARGA', 'NO KARTU KELUARGA'],
        'name' => ['NAMA', 'NAMA LENGKAP', 'NAMA PENDUDUK', 'NAMA WARGA'],
        'title_front' => ['GELAR DEPAN'],
        'title_back' => ['GELAR BELAKANG'],
        'place_of_birth' => ['TEMPAT LAHIR', 'TMP LAHIR', 'TEMPAT LHR'],
        'date_of_birth' => ['TANGGAL LAHIR', 'TGL LAHIR', 'TGL LHR'],
        'gender' => ['JENIS KELAMIN', 'KELAMIN', 'JK', 'L P', 'SEX'],

        // Wilayah & keluarga
        'address' => ['ALAMAT', 'ALAMAT LENGKAP', 'ALAMAT RUMAH', 'JALAN'],
        'rt' => ['RT', 'NO RT'],
        'rw' => ['RW', 'NO RW'],
        'rt_rw' => ['RT RW'],
        'hamlet' => ['DUSUN', 'NAMA DUSUN', 'DUKUH', 'KAMPUNG'],
        'family_role' => [
            'SHDK', 'STATUS HUBUNGAN DALAM KELUARGA', 'HUBUNGAN KELUARGA',
            'HUB KELUARGA', 'STATUS DALAM KELUARGA',
        ],
        // Isi berupa NIK dikosongkan CitizenImportValues (bukan nama).
        'father_name_text' => ['NAMA AYAH', 'AYAH'],
        'mother_name_text' => ['NAMA IBU', 'NAMA IBU KANDUNG', 'IBU'],

        // Data sosial
        'religion' => ['AGAMA'],
        'last_education' => ['PENDIDIKAN', 'PENDIDIKAN TERAKHIR', 'PENDIDIKAN DALAM KK', 'IJAZAH TERAKHIR'],
        'marital_status' => ['STS KAWIN', 'STATUS KAWIN', 'STATUS PERKAWINAN', 'STATUS NIKAH'],
        'blood_type' => ['GOLONGAN DARAH', 'GOL DARAH', 'GOL DRH'],
        'disability' => ['DISABILITAS', 'JENIS DISABILITAS', 'PENYANDANG CACAT', 'KELAINAN FISIK DAN MENTAL'],

        // Dokumen
        'birth_certificate_number' => ['NO AKTA LAHIR', 'NOMOR AKTA KELAHIRAN', 'AKTA KELAHIRAN'],
        'marriage_certificate_number' => ['NO AKTA KAWIN', 'NO BUKU NIKAH', 'AKTA PERKAWINAN'],
        'marriage_date' => ['TANGGAL PERKAWINAN', 'TGL KAWIN', 'TANGGAL NIKAH'],
        'divorce_certificate_number' => ['NO AKTA CERAI', 'AKTA PERCERAIAN'],
        'divorce_date' => ['TANGGAL PERCERAIAN', 'TGL CERAI'],

        // Domisili
        'domicile_status' => ['STATUS DOMISILI'],
        'residency_type' => ['JENIS PENDUDUK', 'STATUS PENDUDUK', 'STATUS KEPENDUDUKAN'],
        'current_domicile' => ['DOMISILI SEKARANG', 'ALAMAT DOMISILI'],
        'origin_region' => ['DAERAH ASAL', 'ASAL DAERAH', 'ALAMAT ASAL'],
    ];

    /** Nama field untuk ditampilkan ke petugas. */
    private const LABELS = [
        'nik' => 'NIK',
        'no_kk' => 'No. KK',
        'name' => 'Nama',
        'title_front' => 'Gelar Depan',
        'title_back' => 'Gelar Belakang',
        'place_of_birth' => 'Tempat Lahir',
        'date_of_birth' => 'Tanggal Lahir',
        'gender' => 'Jenis Kelamin',
        'address' => 'Alamat',
        'rt' => 'RT',
        'rw' => 'RW',
        'rt_rw' => 'RT/RW',
        'rt_id' => 'RT (ID sistem)',
        'hamlet' => 'Dusun',
        'hamlet_id' => 'Dusun (ID sistem)',
        'family_id' => 'KK (ID sistem)',
        'family_role' => 'SHDK',
        'father_id' => 'Ayah (ID sistem)',
        'mother_id' => 'Ibu (ID sistem)',
        'father_name_text' => 'Nama Ayah',
        'mother_name_text' => 'Nama Ibu',
        'marital_status' => 'Status Kawin',
        'religion' => 'Agama',
        'last_education' => 'Pendidikan Terakhir',
        'blood_type' => 'Golongan Darah',
        'disability' => 'Disabilitas',
        'has_disorder' => 'Memiliki Kelainan',
        'birth_certificate_number' => 'No. Akta Lahir',
        'marriage_certificate_number' => 'No. Akta Kawin',
        'marriage_date' => 'Tanggal Kawin',
        'divorce_certificate_number' => 'No. Akta Cerai',
        'divorce_date' => 'Tanggal Cerai',
        'domicile_status' => 'Status Domisili',
        'residency_type' => 'Jenis Penduduk',
        'current_domicile' => 'Domisili Sekarang',
        'origin_region' => 'Daerah Asal',
    ];

    public static function label(string $field): string
    {
        return self::LABELS[$field] ?? $field;
    }

    /** Field untuk satu teks header, atau null bila tidak dikenali. */
    public static function fieldOf(mixed $header): ?string
    {
        return self::lookup()[self::normalizeHeader($header)] ?? null;
    }

    /**
     * Kolom wajib yang tidak ada di file; tanpa kolom ini setiap baris gagal
     * validasi. NIK dan nama sudah dipastikan oleh isHeader().
     *
     * @param  array<string, string>  $columns  huruf kolom => field
     * @return list<string> label kolom
     */
    public static function missingRequired(array $columns): array
    {
        $has = fn (string ...$fields) => array_intersect($fields, $columns) !== [];
        $missing = [];

        foreach (['date_of_birth', 'gender', 'address'] as $field) {
            if (! $has($field)) {
                $missing[] = self::label($field);
            }
        }

        $hasRegion = $has('rt_id') || $has('rt_rw') || ($has('rt') && $has('rw'));
        if (! $hasRegion) {
            $missing[] = 'RT dan RW';
        }

        return $missing;
    }

    /**
     * "STS KAWIN\nB/S/P" -> "STS KAWIN", "tgl_lahir" -> "TGL LAHIR":
     * keterangan di baris kedua sel header dibuang, tanda baca dan garis
     * bawah jadi spasi, huruf besar.
     */
    public static function normalizeHeader(mixed $value): string
    {
        $firstLine = explode("\n", str_replace("\r", '', (string) $value))[0];
        $clean = preg_replace('/[^A-Z0-9]+/', ' ', strtoupper($firstLine));

        return trim((string) $clean);
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
