<?php

namespace Tests\Feature;

use App\Exports\CitizensTemplateExport;
use App\Imports\Support\CitizenImportColumns;
use App\Models\Citizen;
use App\Models\Rt;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

/**
 * Dokumen & keterangan tambahan warga (F-1.01): gelar, akta lahir,
 * perkawinan, perceraian, dan kelainan fisik & mental. Nomor akta dan jenis
 * cacat disimpan terenkripsi.
 */
class CitizenDocumentFieldsTest extends TestCase
{
    use RefreshDatabase;

    private User $petugas;

    private Rt $rt;

    protected function setUp(): void
    {
        parent::setUp();

        $village = Village::factory()->create();
        $this->petugas = User::factory()->create(['role' => 'staf_sid', 'village_id' => $village->id]);
        $this->rt = Rt::factory()->create();
    }

    public function test_store_saves_the_document_fields_and_encrypts_the_numbers(): void
    {
        $id = $this->actingAs($this->petugas)
            ->postJson('/api/citizens', [
                ...$this->person(),
                'title_front' => 'Dr.',
                'title_back' => 'S.Pd.',
                'birth_certificate_number' => '3207-LT-01011990-0001',
                'marriage_certificate_number' => '123/45/X/2015',
                'marriage_date' => '2015-10-10',
                'has_disorder' => true,
                'disability' => 'Tuna netra',
            ])
            ->assertCreated()
            ->assertJsonPath('data.title_back', 'S.Pd.')
            ->assertJsonPath('data.birth_certificate_number', '3207-LT-01011990-0001')
            ->assertJsonPath('data.marriage_date', '2015-10-10')
            ->assertJsonPath('data.has_disorder', true)
            ->assertJsonPath('data.disability', 'Tuna netra')
            ->json('data.id');

        // Tersimpan terenkripsi di database, terbaca utuh lewat model.
        $raw = DB::table('citizens')->where('id', $id)->first();
        foreach (['birth_certificate_number', 'marriage_certificate_number', 'disability'] as $column) {
            $this->assertNotNull($raw->{$column});
            $this->assertStringNotContainsString('Tuna netra', $raw->{$column});
            $this->assertStringNotContainsString('3207-LT', $raw->{$column});
        }
        $this->assertSame('123/45/X/2015', Citizen::query()->findOrFail($id)->marriage_certificate_number);
    }

    public function test_disability_requires_and_follows_the_disorder_flag(): void
    {
        $this->actingAs($this->petugas)
            ->postJson('/api/citizens', [...$this->person(), 'has_disorder' => true])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('disability');

        $id = $this->actingAs($this->petugas)
            ->postJson('/api/citizens', [...$this->person(), 'has_disorder' => true, 'disability' => 'Tuna rungu'])
            ->assertCreated()
            ->json('data.id');

        // Tidak ada kelainan lagi: jenis cacat ikut dikosongkan.
        $this->actingAs($this->petugas)
            ->patchJson("/api/citizens/{$id}", ['has_disorder' => false])
            ->assertOk()
            ->assertJsonPath('data.has_disorder', false)
            ->assertJsonPath('data.disability', null);
    }

    public function test_import_reads_the_document_columns_of_the_template(): void
    {
        $this->assertContains('birth_certificate_number', CitizenImportColumns::SYSTEM_FIELDS);
        $this->assertContains('disability', CitizenImportColumns::SYSTEM_FIELDS);
        $this->assertContains('NO AKTA LAHIR', CitizensTemplateExport::headings());
        $this->assertContains('DISABILITAS', CitizensTemplateExport::headings());

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray(['nik', 'name', 'date_of_birth', 'gender', 'address', 'rt_id', 'title_back', 'birth_certificate_number', 'has_disorder', 'disability'], null, 'A1');
        $sheet->fromArray([
            ['3201012345670011', 'Warga Satu', '1990-05-12', 'P', 'Jl. Merdeka 1', $this->rt->id, 'S.Kom.', '3207-LT-12051990-0002', '1', 'Tuna daksa'],
            // Ada kelainan tanpa jenis cacat: baris dilewati.
            ['3201012345670012', 'Warga Dua', '1991-06-13', 'L', 'Jl. Merdeka 2', $this->rt->id, '', '', '1', ''],
        ], null, 'A2');
        $path = tempnam(sys_get_temp_dir(), 'citizens_import_').'.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        $this->actingAs($this->petugas)
            ->postJson('/api/citizens/import', ['file' => new UploadedFile($path, 'warga.xlsx', null, null, true)])
            ->assertOk()
            ->assertJsonPath('data.success_count', 1)
            ->assertJsonPath('data.error_count', 1);

        $citizen = Citizen::query()->where('nik_hash', hash('sha256', '3201012345670011'))->firstOrFail();
        $this->assertSame('S.Kom.', $citizen->title_back);
        $this->assertSame('3207-LT-12051990-0002', $citizen->birth_certificate_number);
        $this->assertTrue($citizen->has_disorder);
        $this->assertSame('Tuna daksa', $citizen->disability);
    }

    /**
     * @return array<string, mixed>
     */
    private function person(): array
    {
        return [
            'nik' => '3201012345670001',
            'name' => 'Siti Aminah',
            'date_of_birth' => '1990-05-12',
            'gender' => 'P',
            'address' => 'Jl. Merdeka No. 10',
            'rt_id' => $this->rt->id,
        ];
    }

    public function test_document_numbers_are_whole_only_for_population_managers_and_the_owner(): void
    {
        $villageId = $this->petugas->village_id;
        $birth = '3201-LT-12052010-0042';
        $marriage = '1234/56/VII/2015';
        $citizen = Citizen::factory()->create([
            'village_id' => $villageId,
            'rt_id' => $this->rt->id,
            'birth_certificate_number' => $birth,
            'marriage_certificate_number' => $marriage,
        ]);
        $masked = fn (string $number): string => str_repeat('*', strlen($number) - 4).substr($number, -4);
        $row = fn (User $user): array => collect($this->actingAs($user)->getJson('/api/citizens?per_page=50')->assertOk()->json('data'))
            ->firstWhere('id', $citizen->id);

        $kasi = $this->makeUserWithOfficialAssignment('kasi_pemerintahan', 'kasi_pemerintahan', $villageId);
        $kaur = $this->makeUserWithOfficialAssignment('kaur_tu_umum', 'kaur_tu_umum', $villageId);
        $rt = $this->makeUserWithOfficialAssignment('rt', 'rt', $villageId, ['rt_id' => $this->rt->id]);

        // Pengelola data kependudukan melihat nomor utuh.
        foreach ([$this->petugas, $kasi] as $manager) {
            $this->assertSame([$birth, $marriage], [$row($manager)['birth_certificate_number'], $row($manager)['marriage_certificate_number']]);
        }

        // Pembaca lain melihat versi tersamar (empat karakter terakhir).
        foreach ([$kaur, $rt] as $reader) {
            $this->assertSame(
                [$masked($birth), $masked($marriage)],
                [$row($reader)['birth_certificate_number'], $row($reader)['marriage_certificate_number']],
            );
        }

        // Pemilik data melihat nomornya sendiri utuh di profil akunnya.
        $owner = User::factory()->create(['role' => 'warga', 'village_id' => $villageId, 'citizen_id' => $citizen->id]);
        $this->actingAs($owner)->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.citizen.birth_certificate_number', $birth);
    }
}
