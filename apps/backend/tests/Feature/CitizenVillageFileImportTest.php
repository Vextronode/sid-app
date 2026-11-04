<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Testing\File as TestingFile;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

/**
 * Impor file pemutakhiran data pemilih desa (format sheet PEMUTAKHIRAN di
 * docs/template-surat/DATA PENDUDUK.xlsb): tabel di bawah sel bantu, di
 * sheet kedua, dengan kolom bantu yang harus diabaikan.
 */
class CitizenVillageFileImportTest extends TestCase
{
    use RefreshDatabase;

    /** Header asli baris 8 (A-Q) + contoh kolom bantu yang diabaikan. */
    private const HEADERS = [
        'NO', 'DPID', 'NKK', 'NIK', 'NAMA', 'TEMPAT LAHIR', 'TANGGAL LAHIR', "STS KAWIN\nB/S/P",
        "JENIS KELAMIN\nL/P", 'ALAMAT', 'RT', 'RW', 'DISABILITAS', 'EKTP', 'KET', 'SUMBER', 'TPS AKTIF',
        'PEMUTAKHIRAN', 'STATUS', 'USIA', 'CEK NIK',
    ];

    private Village $village;

    private Hamlet $patrol;

    private Hamlet $sinargalih;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        $this->patrol = Hamlet::factory()->create(['village_id' => $this->village->id, 'name' => 'Patrol']);
        $this->sinargalih = Hamlet::factory()->create(['village_id' => $this->village->id, 'name' => 'Sinargalih']);

        // Nomor RW urut se-desa: RW 001 di Patrol, RW 006 di Sinargalih.
        foreach ([[$this->patrol, '001'], [$this->sinargalih, '006']] as [$hamlet, $number]) {
            $rw = Rw::factory()->create(['village_id' => $this->village->id, 'hamlet_id' => $hamlet->id, 'number' => $number]);

            foreach (['001', '002'] as $rt) {
                Rt::factory()->create(['village_id' => $this->village->id, 'rw_id' => $rw->id, 'number' => $rt]);
            }
        }
    }

    /**
     * Satu baris data: [NKK, NIK, NAMA, TEMPAT, TGL, KAWIN, JK, ALAMAT, RT, RW, DISABILITAS].
     *
     * @param  list<list<mixed>>  $people
     */
    private function villageFile(array $people): UploadedFile
    {
        $spreadsheet = new Spreadsheet;
        // Sheet pertama tanpa tabel warga (seperti DPSHP/KODE di file asli).
        $spreadsheet->getActiveSheet()->setTitle('DPSHP')->fromArray([['KEY-DP', 'KECAMATAN', 'KELURAHAN', 'TPS']]);

        $sheet = $spreadsheet->createSheet()->setTitle('PEMUTAKHIRAN');
        // Sel bantu di atas tabel (baris 1-7).
        $sheet->setCellValue('V3', 'A-PERUBAHAN');
        $sheet->setCellValue('S5', 'KESALAHAN');
        $sheet->fromArray(self::HEADERS, null, 'A8');
        // Baris nomor kolom di bawah header.
        $sheet->fromArray(range(1, 17), null, 'A9');

        foreach ($people as $index => [$nkk, $nik, $name, $place, $dob, $marital, $gender, $address, $rt, $rw, $disability]) {
            $row = 10 + $index;
            $sheet->setCellValue("A{$row}", $index + 1);
            foreach (['C' => $nkk, 'D' => $nik, 'G' => $dob, 'K' => $rt, 'L' => $rw] as $column => $value) {
                $sheet->setCellValueExplicit("{$column}{$row}", $value, DataType::TYPE_STRING);
            }
            $sheet->fromArray([$name, $place], null, "E{$row}");
            $sheet->fromArray([$marital, $gender, $address], null, "H{$row}");
            $sheet->setCellValue("M{$row}", $disability);
            $sheet->fromArray(['s', 0, 'dp4', 7, 'DP-AKTIF', 'TMS', 40, 1], null, "N{$row}");
        }

        $path = tempnam(sys_get_temp_dir(), 'village_import_').'.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        return new UploadedFile($path, 'data-warga.xlsx', null, null, true);
    }

    private function import(UploadedFile $file)
    {
        $petugas = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);

        return $this->actingAs($petugas)->postJson('/api/citizens/import', ['file' => $file]);
    }

    private function citizen(string $nik): Citizen
    {
        return Citizen::query()->where('nik_hash', hash('sha256', $nik))->firstOrFail();
    }

    public function test_imports_known_columns_from_a_village_voter_file(): void
    {
        $this->import($this->villageFile([
            ['3218201605130009', '3218205001930005', 'KARTIKA PURTANTI', 'CIAMIS.', '10|01|1993', 'S', 'P', 'DUSUN PATROL', '002', '001', 0],
        ]))
            ->assertOk()
            ->assertJsonPath('data.success_count', 1)
            ->assertJsonPath('data.error_count', 0);

        $citizen = $this->citizen('3218205001930005');
        $rt = Rt::query()->where('number', '002')->whereHas('rw', fn ($q) => $q->where('number', '001'))->firstOrFail();

        $this->assertSame('KARTIKA PURTANTI', $citizen->name);
        $this->assertSame('CIAMIS', $citizen->place_of_birth);
        $this->assertSame('1993-01-10', $citizen->date_of_birth->toDateString());
        $this->assertSame('P', $citizen->gender);
        $this->assertSame('kawin', $citizen->marital_status);
        $this->assertSame('DUSUN PATROL', $citizen->address);
        $this->assertSame($rt->id, $citizen->rt_id);
        $this->assertSame($this->patrol->id, $citizen->hamlet_id);
        $this->assertSame('import_excel', $citizen->data_source->value);
        $this->assertNull($citizen->disability);

        // Field yang tidak ada di file dibiarkan kosong.
        $this->assertNull($citizen->religion);
        $this->assertNull($citizen->last_education);
        $this->assertNull($citizen->occupation_id);

        $family = Family::query()->where('no_kk_hash', hash('sha256', '3218201605130009'))->firstOrFail();
        $this->assertSame($family->id, $citizen->family_id);
        $this->assertSame($rt->rw_id, $family->rw_id);
    }

    public function test_status_p_is_left_empty_and_disability_code_becomes_a_label(): void
    {
        $this->import($this->villageFile([
            ['3218200101100001', '3218204404550001', 'PARTI', 'CIAMIS', '04|04|1955', 'P', 'P', 'DUSUN PATROL', '001', '001', 6],
        ]))->assertJsonPath('data.success_count', 1);

        $citizen = $this->citizen('3218204404550001');
        $this->assertNull($citizen->marital_status);
        $this->assertSame('Disabilitas Sensorik Netra', $citizen->disability);
        $this->assertTrue((bool) $citizen->has_disorder);
    }

    public function test_hamlet_comes_from_address_with_typos_or_falls_back_to_the_rw(): void
    {
        $this->import($this->villageFile([
            // Salah ketik nama dusun tetap dikenali.
            ['3218200101100002', '3218200303910001', 'ERIK', 'KUNINGAN', '03|03|1991', 'B', 'L', 'DUSUN SIRNAGALIH', '001', '006', 0],
            // Alamat perumahan tanpa nama dusun: ikut dusun milik RW 006.
            ['3218200101100003', '3218200404920001', 'ASEP', 'CIAMIS', '04|04|1992', 'B', 'L', 'PERUM CITIIS INDAH NO 28', '002', '006', 0],
            // Nama desa di alamat tidak dianggap nama dusun.
            ['3218200101100004', '3218200505930001', 'UJANG', 'CIAMIS', '05|05|1993', 'B', 'L', 'PATROL DESA SINARGALIH', '001', '006', 0],
        ]))->assertJsonPath('data.success_count', 3);

        $this->assertSame($this->sinargalih->id, $this->citizen('3218200303910001')->hamlet_id);
        $this->assertSame($this->sinargalih->id, $this->citizen('3218200404920001')->hamlet_id);
        $this->assertSame($this->patrol->id, $this->citizen('3218200505930001')->hamlet_id);
    }

    public function test_unknown_rw_or_rt_fails_only_that_row(): void
    {
        $response = $this->import($this->villageFile([
            ['3218200101100005', '3218200606940001', 'VALID', 'CIAMIS', '06|06|1994', 'B', 'L', 'DUSUN PATROL', '001', '001', 0],
            ['3218200101100006', '3218200707950001', 'RW SALAH', 'CIAMIS', '07|07|1995', 'B', 'L', 'DUSUN PATROL', '001', '000', 0],
            ['3218200101100007', '3218200808960001', 'RT SALAH', 'CIAMIS', '08|08|1996', 'B', 'L', 'DUSUN PATROL', '014', '001', 0],
        ]))->assertOk();

        // Baris nomor kolom (baris 9) dilewati tanpa dicatat sebagai error.
        $response->assertJsonPath('data.total_rows', 3)
            ->assertJsonPath('data.success_count', 1)
            ->assertJsonPath('data.errors', [
                ['row' => 11, 'message' => 'RW 000 tidak ditemukan di data wilayah desa.'],
                ['row' => 12, 'message' => 'RT 014 tidak ditemukan di RW 001.'],
            ]);

        // KK dari baris yang gagal tidak ikut tersimpan.
        $this->assertSame(1, Family::query()->count());
    }

    public function test_family_roles_are_guessed_per_kk(): void
    {
        $kk = '3218201111110001';

        $this->import($this->villageFile([
            // Anak ditulis lebih dulu: urutan baris tidak menentukan SHDK.
            [$kk, '3218201010050001', 'ANAK LAKI', 'CIAMIS', '10|10|2005', 'B', 'L', 'DUSUN PATROL', '001', '001', 0],
            [$kk, '3218205505700001', 'ISTRI', 'CIAMIS', '15|05|1970', 'S', 'P', 'DUSUN PATROL', '001', '001', 0],
            [$kk, '3218200101680001', 'KEPALA', 'CIAMIS', '01|01|1968', 'S', 'L', 'DUSUN PATROL', '001', '001', 0],
            // Kawin tetapi bukan yang tertua: dikosongkan.
            [$kk, '3218200202900001', 'MENANTU', 'CIAMIS', '02|02|1990', 'S', 'L', 'DUSUN PATROL', '001', '001', 0],
            // KK janda sendiri (P): anggota tertua menjadi kepala keluarga.
            ['3218202222220002', '3218204101500001', 'JANDA', 'CIAMIS', '01|01|1950', 'P', 'P', 'DUSUN PATROL', '002', '001', 0],
        ]))->assertJsonPath('data.success_count', 5);

        $this->assertSame('kepala_keluarga', $this->citizen('3218200101680001')->family_role->value);
        $this->assertSame('istri', $this->citizen('3218205505700001')->family_role->value);
        $this->assertSame('anak', $this->citizen('3218201010050001')->family_role->value);
        $this->assertNull($this->citizen('3218200202900001')->family_role);
        $this->assertSame('kepala_keluarga', $this->citizen('3218204101500001')->family_role->value);

        $family = Family::query()->where('no_kk_hash', hash('sha256', $kk))->firstOrFail();
        $this->assertSame('KEPALA', $family->headMember->name);
        $this->assertSame(4, $family->members()->count());
    }

    public function test_existing_family_head_is_not_replaced(): void
    {
        $kk = '3218203333330003';
        // RT yang sudah ada: factory RT/RW baru bisa bernomor sama dengan RW 001.
        $rt = Rt::query()->firstOrFail();
        $family = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => $kk, 'rt_id' => $rt->id, 'rw_id' => $rt->rw_id, 'hamlet_id' => $this->patrol->id]);
        Citizen::factory()->create(['village_id' => $this->village->id, 'family_id' => $family->id, 'family_role' => 'kepala_keluarga', 'rt_id' => $rt->id, 'hamlet_id' => $this->patrol->id]);

        $this->import($this->villageFile([
            [$kk, '3218200101700002', 'SUAMI LAIN', 'CIAMIS', '01|01|1970', 'S', 'L', 'DUSUN PATROL', '001', '001', 0],
        ]))->assertJsonPath('data.success_count', 1);

        $this->assertNull($this->citizen('3218200101700002')->family_role);
        $this->assertSame(1, Citizen::query()->where('family_id', $family->id)->where('family_role', 'kepala_keluarga')->count());
    }

    public function test_file_without_nik_and_name_columns_is_rejected(): void
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getActiveSheet()->fromArray([['KODE', 'KETERANGAN'], ['1', 'Satu']]);
        $path = tempnam(sys_get_temp_dir(), 'village_import_').'.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        $this->import(new UploadedFile($path, 'rekap.xlsx', null, null, true))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_xlsb_upload_is_rejected_with_conversion_hint(): void
    {
        $this->import(TestingFile::create('DATA PENDUDUK.xlsb', 100))
            ->assertStatus(422)
            ->assertJsonPath('errors.file.0', 'File .xlsb belum didukung. Buka file di Excel, pilih Simpan Sebagai (Save As) "Excel Workbook (*.xlsx)", lalu unggah file .xlsx tersebut.');
    }
}
