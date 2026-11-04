<?php

namespace App\Exports;

use App\Exports\CitizenTemplate\CitizenTemplateDataSheet;
use App\Exports\CitizenTemplate\CitizenTemplateGuideSheet;
use App\Exports\CitizenTemplate\CitizenTemplateListSheet;
use App\Exports\CitizenTemplate\CitizenTemplateReference;
use App\Imports\Support\CitizenImportColumns;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

/**
 * Template impor warga (UC-09), GET /citizens/import-template. Dibuat ulang
 * dari database setiap kali diunduh, untuk desa pengunduh.
 *
 * Format resmi yang langsung sesuai kriteria impor, tanpa perlu alias atau
 * pencocokan longgar:
 * - Judul kolom persis yang dikenali CitizenImportColumns (kolom wajib
 *   bertanda " *", diabaikan saat dibaca).
 * - Pilihan tetap sistem (agama, SHDK, ...) memakai dropdown ketat.
 * - Dusun, RW, RT (mengikuti RW), dan pekerjaan memakai dropdown dari data
 *   desa terbaru; jenisnya peringatan supaya data yang baru ditambahkan di
 *   sistem setelah template diunduh tetap bisa diketik (server mencocokkan
 *   ke database terbaru saat impor).
 * - NIK, No. KK, RW, RT berformat Teks; tanggal berupa sel tanggal.
 * - Baris 2 berisi contoh dengan NIK khusus (EXAMPLE_NIK) yang selalu
 *   dilewati impor, jadi boleh dibiarkan.
 *
 * Template lama ber-header snake_case tetap diterima impor.
 */
class CitizensTemplateExport implements Export, WithMultipleSheets
{
    public const DATA_SHEET = 'Data Warga';

    public const GUIDE_SHEET = 'Petunjuk';

    public const LIST_SHEET = 'Daftar Pilihan';

    /**
     * Kolom template, urut. choices: daftar tetap (dropdown ketat) atau nama
     * daftar dari data desa (hamlets/rws/rts/occupations, dropdown peringatan).
     *
     * @var list<array{header: string, required: bool, format: 'text'|'date'|null, choices: list<string>|string|null, accepts: string, example: string}>
     */
    public const COLUMNS = [
        ['header' => 'NIK', 'required' => true, 'format' => 'text', 'choices' => null,
            'accepts' => '16 digit angka. Kolom ini sudah berformat Teks.', 'example' => self::EXAMPLE_NIK],
        ['header' => 'NO KK', 'required' => false, 'format' => 'text', 'choices' => null,
            'accepts' => '16 digit No. Kartu Keluarga. KK dibuat otomatis bila belum terdaftar; anggota satu KK memakai nomor yang sama.',
            'example' => '3201019999990100'],
        ['header' => 'NAMA LENGKAP', 'required' => true, 'format' => null, 'choices' => null,
            'accepts' => 'Nama sesuai KTP/KK, tanpa gelar.', 'example' => 'CONTOH NAMA WARGA'],
        ['header' => 'GELAR DEPAN', 'required' => false, 'format' => null, 'choices' => null,
            'accepts' => 'Mis. Dr., H., Hj.', 'example' => ''],
        ['header' => 'GELAR BELAKANG', 'required' => false, 'format' => null, 'choices' => null,
            'accepts' => 'Mis. S.Pd., S.Kom.', 'example' => 'S.Pd.'],
        ['header' => 'TEMPAT LAHIR', 'required' => false, 'format' => null, 'choices' => null,
            'accepts' => 'Nama kota/kabupaten.', 'example' => 'PANGANDARAN'],
        ['header' => 'TANGGAL LAHIR', 'required' => true, 'format' => 'date', 'choices' => null,
            'accepts' => 'Tanggal, diketik hari/bulan/tahun, mis. 01/01/1990.', 'example' => '1990-01-01'],
        ['header' => 'JENIS KELAMIN', 'required' => true, 'format' => null, 'choices' => ['LAKI-LAKI', 'PEREMPUAN'],
            'accepts' => 'Pilih dari daftar.', 'example' => 'LAKI-LAKI'],
        ['header' => 'AGAMA', 'required' => false, 'format' => null,
            'choices' => ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU'],
            'accepts' => 'Pilih dari daftar.', 'example' => 'ISLAM'],
        ['header' => 'PENDIDIKAN TERAKHIR', 'required' => false, 'format' => null,
            'choices' => ['TIDAK SEKOLAH', 'SD', 'SMP', 'SMA', 'DIPLOMA', 'S1', 'S2', 'S3'],
            'accepts' => 'Pilih dari daftar.', 'example' => 'SMA'],
        ['header' => 'PEKERJAAN', 'required' => false, 'format' => null, 'choices' => 'occupations',
            'accepts' => 'Pilih dari Katalog Pekerjaan desa (sheet Daftar Pilihan). Pekerjaan yang tidak ada di katalog dikosongkan saat impor.',
            'example' => ''],
        ['header' => 'STATUS PERKAWINAN', 'required' => false, 'format' => null,
            'choices' => ['BELUM KAWIN', 'KAWIN', 'KAWIN BELUM TERCATAT', 'CERAI HIDUP', 'CERAI HIDUP BELUM TERCATAT', 'CERAI MATI'],
            'accepts' => 'Pilih dari daftar.', 'example' => 'KAWIN'],
        ['header' => 'SHDK', 'required' => false, 'format' => null,
            'choices' => ['KEPALA KELUARGA', 'SUAMI', 'ISTRI', 'ANAK', 'MENANTU', 'CUCU', 'ORANG TUA', 'MERTUA', 'FAMILI LAIN', 'PEMBANTU', 'LAINNYA'],
            'accepts' => 'Hubungan dalam keluarga; pilih dari daftar. Satu KK hanya boleh satu KEPALA KELUARGA. Bila kosong, sistem menebak dari umur, jenis kelamin, dan status kawin.',
            'example' => 'KEPALA KELUARGA'],
        ['header' => 'GOLONGAN DARAH', 'required' => false, 'format' => null, 'choices' => ['A', 'B', 'AB', 'O', 'TIDAK TAHU'],
            'accepts' => 'Pilih dari daftar.', 'example' => 'O'],
        ['header' => 'NAMA AYAH', 'required' => false, 'format' => null, 'choices' => null,
            'accepts' => 'Nama, bukan NIK.', 'example' => 'CONTOH NAMA AYAH'],
        ['header' => 'NAMA IBU', 'required' => false, 'format' => null, 'choices' => null,
            'accepts' => 'Nama, bukan NIK.', 'example' => 'CONTOH NAMA IBU'],
        ['header' => 'ALAMAT', 'required' => true, 'format' => null, 'choices' => null,
            'accepts' => 'Alamat rumah.', 'example' => 'JL. CONTOH NO. 1'],
        ['header' => 'DUSUN', 'required' => false, 'format' => null, 'choices' => 'hamlets',
            'accepts' => 'Pilih dari daftar dusun desa. Bila kosong, ikut dusun milik RW.', 'example' => ''],
        ['header' => 'RW', 'required' => true, 'format' => 'text', 'choices' => 'rws',
            'accepts' => 'Pilih dari daftar RW desa. Isi RW dulu, lalu RT.', 'example' => ''],
        ['header' => 'RT', 'required' => true, 'format' => 'text', 'choices' => 'rts',
            'accepts' => 'Pilih dari daftar; isinya hanya RT di RW yang dipilih.', 'example' => ''],
        ['header' => 'STATUS DOMISILI', 'required' => false, 'format' => null,
            'choices' => ['MENETAP', 'MERANTAU DALAM NEGERI', 'MERANTAU LUAR NEGERI', 'TKI'],
            'accepts' => 'Pilih dari daftar. Bila kosong: MENETAP.', 'example' => 'MENETAP'],
        ['header' => 'DOMISILI SEKARANG', 'required' => false, 'format' => null, 'choices' => null,
            'accepts' => 'Alamat tinggal sekarang bila merantau.', 'example' => ''],
        ['header' => 'JENIS PENDUDUK', 'required' => false, 'format' => null, 'choices' => ['LOKAL', 'PENDATANG'],
            'accepts' => 'Pilih dari daftar. Bila kosong: LOKAL.', 'example' => 'LOKAL'],
        ['header' => 'DAERAH ASAL', 'required' => false, 'format' => null, 'choices' => null,
            'accepts' => 'Untuk pendatang.', 'example' => ''],
        ['header' => 'NO AKTA LAHIR', 'required' => false, 'format' => null, 'choices' => null,
            'accepts' => 'Nomor akta kelahiran.', 'example' => '3207-LT-01011990-0001'],
        ['header' => 'NO AKTA KAWIN', 'required' => false, 'format' => null, 'choices' => null,
            'accepts' => 'Nomor akta/buku nikah.', 'example' => '123/45/X/2015'],
        ['header' => 'TANGGAL PERKAWINAN', 'required' => false, 'format' => 'date', 'choices' => null,
            'accepts' => 'Tanggal, mis. 10/10/2015.', 'example' => '2015-10-10'],
        ['header' => 'NO AKTA CERAI', 'required' => false, 'format' => null, 'choices' => null,
            'accepts' => 'Nomor akta cerai.', 'example' => ''],
        ['header' => 'TANGGAL PERCERAIAN', 'required' => false, 'format' => 'date', 'choices' => null,
            'accepts' => 'Tanggal, mis. 10/10/2020.', 'example' => ''],
        ['header' => 'DISABILITAS', 'required' => false, 'format' => null, 'choices' => null,
            'accepts' => 'Jenis disabilitas, mis. Tuna Daksa. Kosongkan bila tidak ada.', 'example' => ''],
    ];

    /** NIK baris contoh; impor selalu melewati baris dengan NIK ini. */
    public const EXAMPLE_NIK = CitizenImportColumns::TEMPLATE_EXAMPLE_NIK;

    private readonly CitizenTemplateReference $reference;

    public function __construct(?string $villageId = null)
    {
        $this->reference = CitizenTemplateReference::forVillage($villageId);
    }

    /** Judul kolom di template; kolom wajib diberi " *". */
    public static function headings(): array
    {
        return array_map(
            fn (array $column) => $column['header'].($column['required'] ? ' *' : ''),
            self::COLUMNS,
        );
    }

    /** Huruf kolom untuk satu judul (tanpa "*"), mis. "A" untuk NIK. */
    public static function columnOf(string $header): string
    {
        $index = array_search($header, array_column(self::COLUMNS, 'header'), true);

        return Coordinate::stringFromColumnIndex((int) $index + 1);
    }

    /** Huruf kolom NIK di template (mis. "A"). */
    public static function nikColumn(): string
    {
        return self::columnOf('NIK');
    }

    public function sheets(): array
    {
        return [
            new CitizenTemplateDataSheet($this->reference),
            new CitizenTemplateGuideSheet($this->reference),
            new CitizenTemplateListSheet($this->reference),
        ];
    }
}
