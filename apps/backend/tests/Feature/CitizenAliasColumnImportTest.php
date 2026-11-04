<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

/**
 * File berformat biodata/buku induk (header bahasa Indonesia, label
 * Dukcapil, kode SIAK, kolom DUSUN dan RT/RW gabungan) terbaca lewat alias.
 */
class CitizenAliasColumnImportTest extends TestCase
{
    use RefreshDatabase;

    private const HEADERS = [
        'NO. KK', 'NIK', 'Nama Lengkap', 'Tempat Lahir', 'Tgl_Lahir', 'JK', 'AGAMA', 'Pendidikan Dalam KK',
        'Status Perkawinan', 'SHDK', 'Gol. Darah', 'Nama Ayah', 'Nama Ibu', 'IBU', 'Alamat', 'RT/RW', 'Dusun',
    ];

    private Village $village;

    private Hamlet $patrol;

    private Hamlet $sinargalih;

    private Rt $rt;

    private User $petugas;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->village = Village::factory()->create();
        $this->patrol = Hamlet::factory()->create(['village_id' => $this->village->id, 'name' => 'Patrol']);
        $this->sinargalih = Hamlet::factory()->create(['village_id' => $this->village->id, 'name' => 'Sinargalih']);
        $rw = Rw::factory()->create(['village_id' => $this->village->id, 'hamlet_id' => $this->patrol->id, 'number' => '006']);
        $this->rt = Rt::factory()->create(['village_id' => $this->village->id, 'rw_id' => $rw->id, 'number' => '002']);
        $this->petugas = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);
    }

    /** @param list<list<mixed>> $rows */
    private function makeXlsx(array $rows): UploadedFile
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray(self::HEADERS, null, 'A1');
        $sheet->fromArray($rows, null, 'A2');

        foreach ($rows as $index => $row) {
            foreach ([0, 1] as $column) {
                $sheet->getCell(Coordinate::stringFromColumnIndex($column + 1).($index + 2))
                    ->setValueExplicit((string) $row[$column], DataType::TYPE_STRING);
            }
        }

        $path = tempnam(sys_get_temp_dir(), 'citizens_alias_').'.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        return new UploadedFile($path, 'biodata.xlsx', null, null, true);
    }

    public function test_indonesian_headers_and_dukcapil_values_are_imported(): void
    {
        $file = $this->makeXlsx([
            ['3201010000000001', '3201012345670001', 'Engkos Kosasih', 'Ciamis', '12/05/1975', '1', 'ISLAM',
                'SLTA/SEDERAJAT', 'KAWIN', 'KEPALA KELUARGA', 'AB+', 'Udin', 'Iyah', 'abaikan', 'Kp. Patrol', '002/006', 'Sinar Galih'],
            ['3201010000000001', '3201012345670002', 'Tini Suhartini', 'Ciamis', '03/08/1978', '2', 'KEPERCAYAAN',
                'DIPLOMA IV/STRATA I', 'KAWIN', '3', '-', 'Karta', 'Onah', 'abaikan', 'Kp. Patrol', '002/006', 'Dusun Antah'],
        ]);

        $response = $this->actingAs($this->petugas)
            ->postJson('/api/citizens/import', ['file' => $file])
            ->assertOk()
            ->assertJsonPath('data.success_count', 2)
            ->assertJsonPath('data.error_count', 0)
            ->assertJsonPath('data.warning_count', 2);

        $this->assertSame([
            ['row' => 3, 'message' => 'Agama "KEPERCAYAAN" tidak dikenali; kolom ini dikosongkan.'],
            ['row' => 3, 'message' => 'Dusun "Dusun Antah" tidak ditemukan; dusun diambil dari ALAMAT atau RW.'],
        ], $response->json('data.warnings'));

        $head = Citizen::query()->where('nik_hash', hash('sha256', '3201012345670001'))->firstOrFail();
        $this->assertSame('Engkos Kosasih', $head->name);
        $this->assertSame('1975-05-12', $head->date_of_birth->format('Y-m-d'));
        $this->assertSame('L', $head->gender);
        $this->assertSame('islam', $head->religion->value);
        $this->assertSame('sma', $head->last_education->value);
        $this->assertSame('kawin', $head->marital_status);
        $this->assertSame('kepala_keluarga', $head->family_role->value);
        $this->assertSame('AB', $head->blood_type->value);
        $this->assertSame('Udin', $head->father_name_text);
        $this->assertSame('Iyah', $head->mother_name_text);
        $this->assertSame($this->rt->id, $head->rt_id);
        // Kolom DUSUN mengalahkan dusun milik RW (Patrol).
        $this->assertSame($this->sinargalih->id, $head->hamlet_id);
        $this->assertSame('3201010000000001', $head->family->no_kk);

        $wife = Citizen::query()->where('nik_hash', hash('sha256', '3201012345670002'))->firstOrFail();
        $this->assertSame('P', $wife->gender);
        $this->assertNull($wife->religion);
        $this->assertSame('s1', $wife->last_education->value);
        // SHDK dari file (kode 3), bukan tebakan.
        $this->assertSame('istri', $wife->family_role->value);
        $this->assertNull($wife->blood_type);
        // Dusun tidak dikenal: ikut dusun milik RW.
        $this->assertSame($this->patrol->id, $wife->hamlet_id);
        $this->assertSame($head->family_id, $wife->family_id);
    }

    public function test_preview_reports_the_same_warnings(): void
    {
        $file = $this->makeXlsx([
            ['3201010000000001', '3201012345670001', 'Engkos Kosasih', 'Ciamis', '12/05/1975', 'L', 'Kepercayaan',
                'SD', 'B', 'KEPALA KELUARGA', 'O', 'Udin', 'Iyah', '', 'Kp. Patrol', '002/006', 'Patrol'],
        ]);

        $this->actingAs($this->petugas)
            ->postJson('/api/citizens/import/preview', ['file' => $file])
            ->assertOk()
            ->assertJsonPath('data.new_count', 1)
            ->assertJsonPath('data.warning_count', 1)
            ->assertJsonPath('data.warnings.0.row', 2)
            ->assertJsonPath('data.warnings.0.message', 'Agama "Kepercayaan" tidak dikenali; kolom ini dikosongkan.');

        $this->assertSame(0, Citizen::query()->count());
    }

    public function test_preview_describes_read_ignored_and_missing_columns(): void
    {
        $response = $this->actingAs($this->petugas)
            ->postJson('/api/citizens/import/preview', ['file' => $this->makeXlsx([
                ['3201010000000001', '3201012345670001', 'Engkos', 'Ciamis', '12/05/1975', 'L', 'ISLAM',
                    'SD', 'B', 'KEPALA KELUARGA', 'O', 'Udin', 'Iyah', 'Iyah', 'Kp. Patrol', '002/006', 'Patrol'],
            ])])
            ->assertOk()
            ->assertJsonPath('data.columns.sheet', 'Worksheet')
            ->assertJsonPath('data.columns.header_row', 1)
            ->assertJsonPath('data.columns.missing_required', []);

        $mapped = collect($response->json('data.columns.mapped'));
        $this->assertSame(
            ['column' => 'C', 'header' => 'Nama Lengkap', 'field' => 'name', 'label' => 'Nama'],
            $mapped->firstWhere('field', 'name'),
        );
        $this->assertSame('RT/RW', $mapped->firstWhere('column', 'P')['label']);
        $this->assertCount(16, $mapped);

        // "IBU" juga alias nama ibu, tetapi "Nama Ibu" (kolom M) sudah dipakai.
        $this->assertSame(
            [['column' => 'N', 'header' => 'IBU', 'reason' => 'Kolom Nama Ibu sudah diambil dari kolom M.']],
            $response->json('data.columns.ignored'),
        );
    }

    public function test_preview_lists_missing_required_columns(): void
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray(['NIK', 'NAMA', 'TGL LAHIR', 'ALAMAT', 'RT', 'KETERANGAN'], null, 'A1');
        $sheet->getCell('A2')->setValueExplicit('3201012345670001', DataType::TYPE_STRING);
        $sheet->fromArray(['Engkos', '12/05/1975', 'Kp. Patrol', '002', 'x'], null, 'B2');
        $path = tempnam(sys_get_temp_dir(), 'citizens_missing_').'.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        $this->actingAs($this->petugas)
            ->postJson('/api/citizens/import/preview', ['file' => new UploadedFile($path, 'kurang.xlsx', null, null, true)])
            ->assertOk()
            ->assertJsonPath('data.columns.missing_required', ['Jenis Kelamin', 'RT dan RW'])
            ->assertJsonPath('data.columns.ignored.0.header', 'KETERANGAN')
            ->assertJsonPath('data.columns.ignored.0.reason', 'Tidak dikenali.')
            ->assertJsonPath('data.new_count', 0)
            ->assertJsonPath('data.error_count', 1);
    }
}
