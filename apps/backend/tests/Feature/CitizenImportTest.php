<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Rt;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Testing\File as TestingFile;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

/**
 * EV5-11-S2. POST /citizens/import sesuai paths/citizens/import.yaml.
 */
class CitizenImportTest extends TestCase
{
    use RefreshDatabase;

    private function petugas(?Village $village = null): User
    {
        $village ??= Village::factory()->create();

        return User::factory()->create(['role' => 'petugas_desa', 'village_id' => $village->id]);
    }

    /**
     * @param  list<string>  $headers
     * @param  list<list<mixed>>  $rows
     */
    private function makeXlsx(array $headers, array $rows): UploadedFile
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray($headers, null, 'A1');
        $sheet->fromArray($rows, null, 'A2');

        $path = tempnam(sys_get_temp_dir(), 'citizens_import_').'.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        return new UploadedFile($path, 'warga.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
    }

    public function test_import_creates_valid_rows_and_reports_summary(): void
    {
        $rt = Rt::factory()->create();

        $file = $this->makeXlsx(
            ['nik', 'name', 'date_of_birth', 'gender', 'address', 'rt_id'],
            [
                ['3201012345670001', 'Warga Satu', '1990-05-12', 'P', 'Jl. Merdeka 1', $rt->id],
                ['3201012345670002', 'Warga Dua', '1991-06-13', 'L', 'Jl. Merdeka 2', $rt->id],
            ]
        );

        $this->actingAs($this->petugas())
            ->postJson('/api/citizens/import', ['file' => $file])
            ->assertOk()
            ->assertJsonPath('message', 'Import selesai diproses')
            ->assertJsonPath('data.total_rows', 2)
            ->assertJsonPath('data.success_count', 2)
            ->assertJsonPath('data.error_count', 0)
            ->assertJsonPath('data.errors', []);

        $this->assertDatabaseHas('citizens', ['nik_hash' => hash('sha256', '3201012345670001')]);
        $this->assertDatabaseHas('citizens', ['nik_hash' => hash('sha256', '3201012345670002')]);
    }

    public function test_import_skips_invalid_rows_but_keeps_valid_ones(): void
    {
        $rt = Rt::factory()->create();

        $file = $this->makeXlsx(
            ['nik', 'name', 'date_of_birth', 'gender', 'address', 'rt_id'],
            [
                ['3201012345670001', 'Warga Valid', '1990-05-12', 'P', 'Jl. Merdeka 1', $rt->id],
                ['123', 'NIK Salah Format', '1990-05-12', 'P', 'Jl. Merdeka 2', $rt->id],
                ['3201012345670003', '', '1990-05-12', 'P', 'Jl. Merdeka 3', $rt->id],
            ]
        );

        $response = $this->actingAs($this->petugas())
            ->postJson('/api/citizens/import', ['file' => $file])
            ->assertOk()
            ->assertJsonPath('data.total_rows', 3)
            ->assertJsonPath('data.success_count', 1)
            ->assertJsonPath('data.error_count', 2);

        $rowNumbers = collect($response->json('data.errors'))->pluck('row');
        $this->assertTrue($rowNumbers->contains(3));
        $this->assertTrue($rowNumbers->contains(4));
    }

    public function test_import_skips_duplicate_nik_within_the_same_file(): void
    {
        $rt = Rt::factory()->create();

        $file = $this->makeXlsx(
            ['nik', 'name', 'date_of_birth', 'gender', 'address', 'rt_id'],
            [
                ['3201012345670001', 'Warga Pertama', '1990-05-12', 'P', 'Jl. Merdeka 1', $rt->id],
                ['3201012345670001', 'Warga Duplikat', '1990-05-12', 'P', 'Jl. Merdeka 2', $rt->id],
            ]
        );

        $this->actingAs($this->petugas())
            ->postJson('/api/citizens/import', ['file' => $file])
            ->assertOk()
            ->assertJsonPath('data.success_count', 1)
            ->assertJsonPath('data.error_count', 1)
            ->assertJsonPath('data.errors.0.message', 'NIK sudah ada dalam database warga');

        $this->assertSame(1, Citizen::query()->where('nik_hash', hash('sha256', '3201012345670001'))->count());
    }

    public function test_import_skips_duplicate_nik_already_in_database(): void
    {
        $rt = Rt::factory()->create();
        Citizen::factory()->create(['nik' => '3201012345670001']);

        $file = $this->makeXlsx(
            ['nik', 'name', 'date_of_birth', 'gender', 'address', 'rt_id'],
            [['3201012345670001', 'Warga Baru', '1990-05-12', 'P', 'Jl. Merdeka 1', $rt->id]]
        );

        $this->actingAs($this->petugas())
            ->postJson('/api/citizens/import', ['file' => $file])
            ->assertOk()
            ->assertJsonPath('data.success_count', 0)
            ->assertJsonPath('data.error_count', 1);
    }

    public function test_import_v5_fields_and_family_role_guard(): void
    {
        $village = Village::factory()->create();
        $rt = Rt::factory()->create();
        $family = Family::factory()->create(['village_id' => $village->id]);
        Citizen::factory()->create(['family_id' => $family->id, 'family_role' => 'kepala_keluarga']);

        $file = $this->makeXlsx(
            ['nik', 'name', 'date_of_birth', 'gender', 'address', 'rt_id', 'family_id', 'family_role', 'residency_type'],
            [
                ['3201012345670001', 'Anak Sah', '2010-01-01', 'L', 'Jl. Merdeka 1', $rt->id, $family->id, 'anak', 'lokal'],
                ['3201012345670002', 'Kepala Kedua', '1980-01-01', 'L', 'Jl. Merdeka 2', $rt->id, $family->id, 'kepala_keluarga', 'pendatang'],
            ]
        );

        $response = $this->actingAs($this->petugas($village))
            ->postJson('/api/citizens/import', ['file' => $file])
            ->assertOk()
            ->assertJsonPath('data.success_count', 1)
            ->assertJsonPath('data.error_count', 1);

        $this->assertDatabaseHas('citizens', ['nik_hash' => hash('sha256', '3201012345670001'), 'residency_type' => 'lokal']);
        $this->assertDatabaseMissing('citizens', ['nik_hash' => hash('sha256', '3201012345670002')]);
    }

    public function test_import_ignores_trailing_empty_rows(): void
    {
        $rt = Rt::factory()->create();

        $file = $this->makeXlsx(
            ['nik', 'name', 'date_of_birth', 'gender', 'address', 'rt_id'],
            [
                ['3201012345670001', 'Warga Satu', '1990-05-12', 'P', 'Jl. Merdeka 1', $rt->id],
                [null, null, null, null, null, null],
            ]
        );

        $this->actingAs($this->petugas())
            ->postJson('/api/citizens/import', ['file' => $file])
            ->assertOk()
            ->assertJsonPath('data.total_rows', 1)
            ->assertJsonPath('data.success_count', 1)
            ->assertJsonPath('data.error_count', 0);
    }

    public function test_import_rejects_non_excel_file(): void
    {
        $file = TestingFile::create('warga.txt', 10);

        $this->actingAs($this->petugas())
            ->postJson('/api/citizens/import', ['file' => $file])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_import_forbidden_for_non_petugas_desa(): void
    {
        $file = $this->makeXlsx(['nik', 'name', 'date_of_birth', 'gender', 'address', 'rt_id'], []);

        $this->actingAs(User::factory()->create(['role' => 'warga']))
            ->postJson('/api/citizens/import', ['file' => $file])
            ->assertForbidden();
    }

    public function test_import_requires_authentication(): void
    {
        $file = $this->makeXlsx(['nik', 'name', 'date_of_birth', 'gender', 'address', 'rt_id'], []);

        $this->postJson('/api/citizens/import', ['file' => $file])->assertUnauthorized();
    }
}
