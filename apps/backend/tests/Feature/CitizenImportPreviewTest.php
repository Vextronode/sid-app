<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Rt;
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
 * Impor dua tahap: POST /citizens/import/preview mendaftar NIK yang sudah
 * terdaftar beserta perubahannya, lalu POST /citizens/import dengan token
 * menimpa baris yang dipilih dan melewati sisanya.
 */
class CitizenImportPreviewTest extends TestCase
{
    use RefreshDatabase;

    private const HEADERS = ['nik', 'no_kk', 'name', 'date_of_birth', 'gender', 'address', 'rt_id'];

    private const EXISTING_NIK = '3201012345670001';

    private Village $village;

    private Rt $oldRt;

    private Rt $newRt;

    private User $petugas;

    private Citizen $existing;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->oldRt = Rt::factory()->create();
        $this->village = Village::query()->findOrFail($this->oldRt->village_id);
        $this->newRt = Rt::factory()->create(['village_id' => $this->village->id]);
        $this->petugas = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);

        $this->existing = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'nik' => self::EXISTING_NIK,
            'name' => 'Nama Lama',
            'date_of_birth' => '1980-01-01',
            'gender' => 'L',
            'address' => 'Alamat Lama',
            'religion' => 'islam',
            'rt_id' => $this->oldRt->id,
            'family_id' => null,
            'family_role' => null,
        ]);
    }

    /** @param list<list<mixed>> $rows */
    private function makeXlsx(array $rows): UploadedFile
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray(self::HEADERS, null, 'A1');
        $sheet->fromArray($rows, null, 'A2');

        // NIK dan No KK sebagai Teks, seperti di template.
        foreach ($rows as $index => $row) {
            foreach ([0, 1] as $column) {
                if (($row[$column] ?? null) !== null) {
                    $sheet->getCell(Coordinate::stringFromColumnIndex($column + 1).($index + 2))
                        ->setValueExplicit((string) $row[$column], DataType::TYPE_STRING);
                }
            }
        }

        $path = tempnam(sys_get_temp_dir(), 'citizens_preview_').'.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        return new UploadedFile($path, 'warga.xlsx', null, null, true);
    }

    /** Baris 2 menimpa warga yang ada; baris 3 warga baru. */
    private function previewFile(?string $noKk = null): UploadedFile
    {
        return $this->makeXlsx([
            [self::EXISTING_NIK, $noKk, 'Nama Baru', '1980-01-01', 'L', 'Alamat Baru', $this->newRt->id],
            ['3201012345670002', null, 'Warga Baru', '1995-03-04', 'P', 'Jl. Baru', $this->newRt->id],
        ]);
    }

    private function preview(UploadedFile $file): string
    {
        return $this->actingAs($this->petugas)
            ->postJson('/api/citizens/import/preview', ['file' => $file])
            ->assertOk()
            ->json('data.token');
    }

    public function test_preview_lists_conflicts_with_changes_without_saving(): void
    {
        $response = $this->actingAs($this->petugas)
            ->postJson('/api/citizens/import/preview', ['file' => $this->previewFile()])
            ->assertOk()
            ->assertJsonPath('data.total_rows', 2)
            ->assertJsonPath('data.new_count', 1)
            ->assertJsonPath('data.conflict_count', 1)
            ->assertJsonPath('data.error_count', 0)
            ->assertJsonPath('data.conflicts.0.row', 2)
            ->assertJsonPath('data.conflicts.0.citizen_id', $this->existing->id)
            ->assertJsonPath('data.conflicts.0.name', 'Nama Lama')
            ->assertJsonPath('data.conflicts.0.moves_family', false);

        // Hanya kolom yang berbeda; tanggal lahir & jenis kelamin sama.
        $changes = collect($response->json('data.conflicts.0.changes'))->keyBy('field');
        $this->assertSame(['name', 'address', 'rt_id'], $changes->keys()->all());
        $this->assertSame(
            ['field' => 'name', 'label' => 'Nama', 'before' => 'Nama Lama', 'after' => 'Nama Baru'],
            $changes['name'],
        );
        $this->assertSame(
            'RT '.$this->newRt->number.' / RW '.$this->newRt->rw->number,
            $changes['rt_id']['after'],
        );

        // Tidak ada yang tersimpan; file disimpan untuk tahap 2.
        $this->assertSame(1, Citizen::query()->count());
        $this->assertSame('Nama Lama', $this->existing->fresh()->name);
        Storage::disk('local')->assertExists('citizen-imports/'.$response->json('data.token').'.xlsx');
    }

    public function test_import_overwrites_selected_rows_with_filled_columns_only(): void
    {
        $token = $this->preview($this->previewFile());

        $this->actingAs($this->petugas)
            ->postJson('/api/citizens/import', ['token' => $token, 'overwrite_rows' => [2]])
            ->assertOk()
            ->assertJsonPath('data.total_rows', 2)
            ->assertJsonPath('data.success_count', 1)
            ->assertJsonPath('data.updated_count', 1)
            ->assertJsonPath('data.skipped_count', 0)
            ->assertJsonPath('data.error_count', 0);

        $citizen = $this->existing->fresh();
        $this->assertSame(self::EXISTING_NIK, $citizen->nik);
        $this->assertSame('Nama Baru', $citizen->name);
        $this->assertSame('Alamat Baru', $citizen->address);
        $this->assertSame($this->newRt->id, $citizen->rt_id);
        // Agama tidak ada di file: tidak dikosongkan.
        $this->assertSame('islam', $citizen->religion->value);
        $this->assertSame(2, Citizen::query()->count());

        // File sementara dihapus dan token tidak bisa dipakai lagi.
        Storage::disk('local')->assertMissing("citizen-imports/{$token}.xlsx");
        $this->actingAs($this->petugas)
            ->postJson('/api/citizens/import', ['token' => $token])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('token');
    }

    public function test_import_skips_conflicting_rows_that_are_not_selected(): void
    {
        $token = $this->preview($this->previewFile());

        $this->actingAs($this->petugas)
            ->postJson('/api/citizens/import', ['token' => $token, 'overwrite_rows' => []])
            ->assertOk()
            ->assertJsonPath('data.success_count', 1)
            ->assertJsonPath('data.updated_count', 0)
            ->assertJsonPath('data.skipped_count', 1)
            ->assertJsonPath('data.error_count', 0);

        $this->assertSame('Nama Lama', $this->existing->fresh()->name);
    }

    public function test_different_family_number_is_flagged_and_moves_the_citizen(): void
    {
        $oldFamily = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3201010000000001']);
        $this->existing->update(['family_id' => $oldFamily->id]);

        $response = $this->actingAs($this->petugas)
            ->postJson('/api/citizens/import/preview', ['file' => $this->previewFile('3201010000000002')])
            ->assertOk()
            ->assertJsonPath('data.conflicts.0.moves_family', true);

        $noKk = collect($response->json('data.conflicts.0.changes'))->firstWhere('field', 'no_kk');
        $this->assertSame(['************0001', '************0002'], [$noKk['before'], $noKk['after']]);

        $this->actingAs($this->petugas)
            ->postJson('/api/citizens/import', ['token' => $response->json('data.token'), 'overwrite_rows' => [2]])
            ->assertOk()
            ->assertJsonPath('data.updated_count', 1);

        $this->assertSame('3201010000000002', $this->existing->fresh()->family->no_kk);
    }

    public function test_duplicate_nik_within_the_file_is_an_error_not_a_conflict(): void
    {
        $file = $this->makeXlsx([
            ['3201012345670002', null, 'Warga Baru', '1995-03-04', 'P', 'Jl. Baru', $this->newRt->id],
            ['3201012345670002', null, 'Warga Kembar', '1995-03-04', 'P', 'Jl. Baru', $this->newRt->id],
        ]);

        $this->actingAs($this->petugas)
            ->postJson('/api/citizens/import/preview', ['file' => $file])
            ->assertOk()
            ->assertJsonPath('data.new_count', 1)
            ->assertJsonPath('data.conflict_count', 0)
            ->assertJsonPath('data.errors.0.row', 3)
            ->assertJsonPath('data.errors.0.message', 'NIK sama dengan baris 2 di file ini.');
    }

    public function test_token_belongs_to_the_user_who_previewed(): void
    {
        $token = $this->preview($this->previewFile());
        $other = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);

        $this->actingAs($other)
            ->postJson('/api/citizens/import', ['token' => $token, 'overwrite_rows' => [2]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('token');

        $this->assertSame('Nama Lama', $this->existing->fresh()->name);
    }

    public function test_file_and_token_cannot_be_sent_together(): void
    {
        $this->actingAs($this->petugas)
            ->postJson('/api/citizens/import', [
                'file' => $this->previewFile(),
                'token' => '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file']);
    }

    public function test_preview_requires_a_file_and_the_import_role(): void
    {
        $this->actingAs($this->petugas)
            ->postJson('/api/citizens/import/preview', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        $warga = User::factory()->create(['role' => 'warga', 'village_id' => $this->village->id]);
        $this->actingAs($warga)
            ->postJson('/api/citizens/import/preview', ['file' => $this->previewFile()])
            ->assertForbidden();
    }
}
