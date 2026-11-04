<?php

namespace Tests\Feature;

use App\Exports\CitizensTemplateExport;
use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Occupation;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

/**
 * GET /citizens/import-template: template resmi dari data desa terbaru
 * (dropdown dusun/RW/RT/pekerjaan), dengan baris contoh yang dilewati impor.
 */
class CitizenImportTemplateTest extends TestCase
{
    use RefreshDatabase;

    private Village $village;

    private Hamlet $patrol;

    private Rt $rt;

    private Occupation $farmer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        $this->patrol = Hamlet::factory()->create(['village_id' => $this->village->id, 'name' => 'Patrol']);
        Hamlet::factory()->create(['village_id' => $this->village->id, 'name' => 'Sucen']);
        $rw3 = Rw::factory()->create(['village_id' => $this->village->id, 'hamlet_id' => $this->patrol->id, 'number' => '003']);
        $rw10 = Rw::factory()->create(['village_id' => $this->village->id, 'hamlet_id' => $this->patrol->id, 'number' => '010']);
        $this->rt = Rt::factory()->create(['village_id' => $this->village->id, 'rw_id' => $rw3->id, 'number' => '001']);
        Rt::factory()->create(['village_id' => $this->village->id, 'rw_id' => $rw3->id, 'number' => '002']);
        Rt::factory()->create(['village_id' => $this->village->id, 'rw_id' => $rw10->id, 'number' => '001']);
        $this->farmer = Occupation::factory()->create(['village_id' => $this->village->id, 'name' => 'Petani', 'sort_order' => 1]);
        Occupation::factory()->create(['village_id' => $this->village->id, 'name' => 'Nelayan', 'is_active' => false]);
        // Wilayah desa lain tidak ikut.
        $otherVillage = Village::factory()->create();
        $otherHamlet = Hamlet::factory()->create(['village_id' => $otherVillage->id]);
        Rw::factory()->create(['village_id' => $otherVillage->id, 'hamlet_id' => $otherHamlet->id, 'number' => '099']);
    }

    private function petugas(?Village $village = null): User
    {
        return User::factory()->create(['role' => 'staf_sid', 'village_id' => ($village ?? $this->village)->id]);
    }

    private function downloadTemplate(User $petugas): Spreadsheet
    {
        $response = $this->actingAs($petugas)->get('/api/citizens/import-template');

        $response->assertOk();
        $this->assertStringContainsString('template_impor_warga.xlsx', $response->headers->get('content-disposition'));

        return IOFactory::load($response->baseResponse->getFile()->getPathname());
    }

    private function cell(Spreadsheet $spreadsheet, string $header, int $row): mixed
    {
        return $spreadsheet->getSheetByName(CitizensTemplateExport::DATA_SHEET)
            ->getCell(CitizensTemplateExport::columnOf($header).$row)->getValue();
    }

    public function test_template_has_official_headers_formats_and_an_example_row(): void
    {
        $spreadsheet = $this->downloadTemplate($this->petugas());

        $this->assertSame(
            [CitizensTemplateExport::DATA_SHEET, CitizensTemplateExport::GUIDE_SHEET, CitizensTemplateExport::LIST_SHEET],
            $spreadsheet->getSheetNames(),
        );

        $sheet = $spreadsheet->getSheetByName(CitizensTemplateExport::DATA_SHEET);
        $this->assertSame(CitizensTemplateExport::headings(), $sheet->toArray()[0]);
        $this->assertSame(['NIK *', 'NO KK', 'NAMA LENGKAP *'], array_slice($sheet->toArray()[0], 0, 3));

        // NIK, No. KK, RW, RT berformat Teks di seluruh kolom.
        foreach (['NIK', 'NO KK', 'RW', 'RT'] as $header) {
            $style = $spreadsheet->getCellXfByIndex($sheet->getColumnDimension(CitizensTemplateExport::columnOf($header))->getXfIndex());
            $this->assertSame(NumberFormat::FORMAT_TEXT, $style->getNumberFormat()->getFormatCode(), $header);
        }

        // Baris contoh memakai wilayah & pekerjaan yang ada di desa ini.
        $this->assertSame(CitizensTemplateExport::EXAMPLE_NIK, $this->cell($spreadsheet, 'NIK', 2));
        $this->assertSame(DataType::TYPE_STRING, $sheet->getCell('A2')->getDataType());
        $this->assertSame(['Patrol', '003', '001', 'Petani'], [
            $this->cell($spreadsheet, 'DUSUN', 2), $this->cell($spreadsheet, 'RW', 2),
            $this->cell($spreadsheet, 'RT', 2), $this->cell($spreadsheet, 'PEKERJAAN', 2),
        ]);
        // Tanggal berupa sel tanggal, bukan teks.
        $dateCell = $sheet->getCell(CitizensTemplateExport::columnOf('TANGGAL LAHIR').'2');
        $this->assertSame(DataType::TYPE_NUMERIC, $dateCell->getDataType());
        $this->assertSame('1990-01-01', ExcelDate::excelToDateTimeObject($dateCell->getValue())->format('Y-m-d'));
        $this->assertSame('dd/mm/yyyy', $dateCell->getStyle()->getNumberFormat()->getFormatCode());
    }

    public function test_dropdowns_are_strict_for_fixed_lists_and_follow_village_data(): void
    {
        $spreadsheet = $this->downloadTemplate($this->petugas());
        $sheet = $spreadsheet->getSheetByName(CitizensTemplateExport::DATA_SHEET);
        $validation = fn (string $header) => $sheet->getDataValidation(CitizensTemplateExport::columnOf($header).'3');

        // Pilihan tetap: ketat.
        $this->assertSame(DataValidation::STYLE_STOP, $validation('AGAMA')->getErrorStyle());
        $this->assertSame('"ISLAM,KRISTEN,KATOLIK,HINDU,BUDDHA,KONGHUCU"', $validation('AGAMA')->getFormula1());

        // Data desa: peringatan, dari sheet Daftar Pilihan.
        $this->assertSame(DataValidation::STYLE_WARNING, $validation('DUSUN')->getErrorStyle());
        $this->assertSame("'Daftar Pilihan'!\$E\$4:\$E\$5", $validation('DUSUN')->getFormula1());
        $this->assertSame("'Daftar Pilihan'!\$F\$4:\$F\$5", $validation('RW')->getFormula1());
        // Hanya pekerjaan aktif.
        $this->assertSame("'Daftar Pilihan'!\$G\$4:\$G\$4", $validation('PEKERJAAN')->getFormula1());

        // RT mengikuti RW lewat named range per RW.
        $rwColumn = CitizensTemplateExport::columnOf('RW');
        $this->assertSame(DataValidation::STYLE_WARNING, $validation('RT')->getErrorStyle());
        $this->assertStringContainsString('INDIRECT("RW_"&$'.$rwColumn, $validation('RT')->getFormula1());

        $list = $spreadsheet->getSheetByName(CitizensTemplateExport::LIST_SHEET);
        $rangeOf = fn (string $name) => $spreadsheet->getNamedRange($name)?->getRange();
        $this->assertSame("'Daftar Pilihan'!\$I\$4:\$I\$5", $rangeOf('RW_003'));
        $this->assertSame("'Daftar Pilihan'!\$J\$4:\$J\$4", $rangeOf('RW_010'));
        $this->assertSame(['001', '002'], [$list->getCell('I4')->getValue(), $list->getCell('I5')->getValue()]);
        $this->assertNull($rangeOf('RW_099'));

        $this->assertStringContainsString('Daftar wilayah dan pekerjaan per', (string) $list->getCell('A1')->getValue());
        $this->assertSame(['Patrol', '003', '002'], [$list->getCell('A5')->getValue(), $list->getCell('B5')->getValue(), $list->getCell('C5')->getValue()]);
    }

    public function test_a_filled_template_imports_and_skips_the_example_row(): void
    {
        $petugas = $this->petugas();
        $spreadsheet = $this->downloadTemplate($petugas);
        $sheet = $spreadsheet->getSheetByName(CitizensTemplateExport::DATA_SHEET);

        // Baris contoh dibiarkan; data asli di baris 3.
        $values = [
            'NIK' => '3201010101900001', 'NO KK' => '3201010101900100', 'NAMA LENGKAP' => 'Engkos Kosasih',
            'JENIS KELAMIN' => 'LAKI-LAKI', 'AGAMA' => 'ISLAM', 'PENDIDIKAN TERAKHIR' => 'SMA', 'PEKERJAAN' => 'Petani',
            'STATUS PERKAWINAN' => 'KAWIN', 'SHDK' => 'KEPALA KELUARGA', 'GOLONGAN DARAH' => 'TIDAK TAHU',
            'ALAMAT' => 'Kp. Patrol', 'DUSUN' => 'Patrol', 'RW' => '003', 'RT' => '001',
            'STATUS DOMISILI' => 'MERANTAU DALAM NEGERI', 'JENIS PENDUDUK' => 'PENDATANG',
        ];
        foreach ($values as $header => $value) {
            $sheet->getCell(CitizensTemplateExport::columnOf($header).'3')->setValueExplicit($value, DataType::TYPE_STRING);
        }
        $sheet->getCell(CitizensTemplateExport::columnOf('TANGGAL LAHIR').'3')
            ->setValueExplicit(ExcelDate::PHPToExcel(new \DateTimeImmutable('1975-05-12')), DataType::TYPE_NUMERIC);

        $path = tempnam(sys_get_temp_dir(), 'citizens_template_').'.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        $this->actingAs($petugas)
            ->postJson('/api/citizens/import', ['file' => new UploadedFile($path, 'template_impor_warga.xlsx', null, null, true)])
            ->assertOk()
            ->assertJsonPath('data.success_count', 1)
            ->assertJsonPath('data.error_count', 0)
            ->assertJsonPath('data.warnings', [['row' => 2, 'message' => 'Baris contoh dari template dilewati.']]);

        $this->assertDatabaseMissing('citizens', ['nik_hash' => hash('sha256', CitizensTemplateExport::EXAMPLE_NIK)]);

        $citizen = Citizen::query()->where('nik_hash', hash('sha256', '3201010101900001'))->firstOrFail();
        $this->assertSame('1975-05-12', $citizen->date_of_birth->format('Y-m-d'));
        $this->assertSame('L', $citizen->gender);
        $this->assertSame('sma', $citizen->last_education->value);
        $this->assertSame($this->farmer->id, $citizen->occupation_id);
        $this->assertSame('kepala_keluarga', $citizen->family_role->value);
        $this->assertSame('tidak_tahu', $citizen->blood_type->value);
        $this->assertSame('merantau_dalam_negeri', $citizen->domicile_status->value);
        $this->assertSame('pendatang', $citizen->residency_type->value);
        $this->assertSame($this->rt->id, $citizen->rt_id);
        $this->assertSame($this->patrol->id, $citizen->hamlet_id);
        $this->assertSame('3201010101900100', $citizen->family->no_kk);
    }

    public function test_village_without_regions_still_gets_a_template(): void
    {
        $spreadsheet = $this->downloadTemplate($this->petugas(Village::factory()->create()));
        $sheet = $spreadsheet->getSheetByName(CitizensTemplateExport::DATA_SHEET);

        $this->assertSame(CitizensTemplateExport::EXAMPLE_NIK, $sheet->getCell('A2')->getValue());
        $this->assertSame('', (string) $this->cell($spreadsheet, 'RW', 2));
        $this->assertSame(DataValidation::STYLE_STOP, $sheet->getDataValidation(CitizensTemplateExport::columnOf('AGAMA').'3')->getErrorStyle());
    }

    public function test_other_roles_cannot_download_the_template(): void
    {
        $warga = User::factory()->create(['role' => 'warga']);

        $this->actingAs($warga)
            ->getJson('/api/citizens/import-template')
            ->assertForbidden();
    }
}
