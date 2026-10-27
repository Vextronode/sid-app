<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Occupation;
use App\Models\Rt;
use App\Models\Village;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Database\Seeders\ApprovalFlowSeeder;
use Database\Seeders\ServiceLetterTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * F08 Pengakuan Anak: diajukan anggota KK anak (biasanya ibu); F-2.01
 * bagian pengakuan anak (utama) + F-2.10. Terapkan mengisi nama ayah anak
 * dan menautkannya ke data ayah bila warga desa.
 */
class ChildAcknowledgementServiceTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $mother;

    private Citizen $child;

    private Citizen $father;

    private array $rtApprover;

    private array $kades;

    private array $kasi;

    private Occupation $farmer;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');
        $this->travelTo(now()->setDate(2026, 10, 12)->setTime(9, 0));

        $this->village = Village::factory()->create(['name' => 'Desa Cibenda', 'district' => 'Parigi', 'regency' => 'Pangandaran', 'province' => 'Jawa Barat']);
        $this->seed([ApprovalFlowSeeder::class, ServiceLetterTypeSeeder::class]);
        $this->farmer = Occupation::factory()->create(['village_id' => $this->village->id, 'name' => 'Petani']);

        $rt = $this->makeNamedArea($this->village, 'Budiasih', '19', '2');
        $family = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218011304150002']);
        $this->mother = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'name' => 'Euis Komariah',
            'nik' => '3207246202970002',
            'family_id' => $family->id,
            'family_role' => 'kepala_keluarga',
            'gender' => 'P',
            'date_of_birth' => '1997-02-22',
        ]);
        $this->child = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'rt_id' => $rt->id,
            'family_id' => $family->id,
            'name' => 'Raka Pratama',
            'nik' => '3207241503200001',
            'family_role' => 'anak',
            'gender' => 'L',
            'date_of_birth' => '2020-03-15',
            'father_name_text' => null,
        ]);
        $this->father = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'family_id' => Family::factory()->create(['village_id' => $this->village->id])->id,
            'name' => 'Dadan Ramdani',
            'nik' => '3207240101950001',
            'gender' => 'L',
            'date_of_birth' => '1995-01-01',
        ]);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
        $this->kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village);
    }

    public function test_the_mother_reports_and_both_forms_are_issued(): void
    {
        // Yang diakui bukan suami/kepala keluarga; ibunya perempuan yang minimal
        // 10 tahun lebih tua dari anak (bukan kakak perempuannya); ayah bukan saksi.
        $daughter = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'family_id' => $this->mother['citizen']->family_id,
            'family_role' => 'anak',
            'gender' => 'P',
            'date_of_birth' => '2018-01-01',
        ]);
        $husband = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'family_id' => $this->mother['citizen']->family_id,
            'family_role' => 'suami',
            'gender' => 'L',
        ]);
        $this->submit([...$this->payload(), 'anak' => $husband->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.anak');
        $this->submit([...$this->payload(), 'ibu' => $this->child->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.ibu');
        $this->submit([...$this->payload(), 'ibu' => $daughter->id])
            ->assertJsonValidationErrors('payload.ibu');
        $this->submit([...$this->payload(), 'nik_saksi_1' => '3207240101950001'])
            ->assertJsonValidationErrors(['payload.nik_saksi_1' => 'Saksi tidak boleh orang yang sama dengan NIK Ayah Biologis.']);

        $letterId = $this->approve($this->payload());

        $payload = Letter::query()->findOrFail($letterId)->payload;
        $this->assertSame('Dadan Ramdani', $payload['nama_ayah']);
        $this->assertSame('3207241503200001', $payload['anak_nik']);
        $this->actingAs($this->mother['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f2_10']);

        // F-2.01: jenis Pengakuan Anak; anak sebagai subjek; akta, ibu, dan ayah.
        $report = $this->render($letterId, null);
        $this->assertSame(1, substr_count($report, '>X</td>'));
        $this->assertMatchesRegularExpression($this->boxes('RAKA'), $report);
        // Nomor akta 21 karakter melewati 17 kotak di Excel; sisanya dicetak di sel sesudahnya.
        $this->assertMatchesRegularExpression($this->boxes('3207-LT-15032020-000'), $report);
        $this->assertMatchesRegularExpression($this->boxes('DADAN'), $report);
        $this->assertMatchesRegularExpression($this->boxes('EUIS'), $report);
        $this->assertStringNotContainsString('[[', $report);

        // F-2.10: NIK dan akta anak terisi; ayah dari isian, disetujui ibu.
        $statement = $this->render($letterId, 'f2_10');
        $this->assertStringContainsString('SURAT PERNYATAAN PENGAKUAN ANAK', $statement);
        $this->assertStringContainsString('>3207241503200001<', $statement);
        $this->assertStringContainsString('>3207-LT-15032020-0001<', $statement);
        $this->assertStringContainsString('Ciamis, 1 Januari 1995', $statement);
        $this->assertStringContainsString('>Petani<', $statement);
        $this->assertStringContainsString('>Euis Komariah<', $statement);
        $this->assertStringNotContainsString('…', $statement);
    }

    public function test_grandchild_in_the_grandparents_family_can_be_acknowledged(): void
    {
        // KK kakek: Ujang (kepala), Iis (istri), Euis (anak, ibu Raka), Raka (cucu).
        $this->mother['citizen']->update(['family_role' => 'anak']);
        $this->child->update(['family_role' => 'cucu']);
        $grandmother = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'family_id' => $this->mother['citizen']->family_id,
            'family_role' => 'istri',
            'gender' => 'P',
            'date_of_birth' => '1965-05-05',
        ]);

        $letterId = $this->approve($this->payload());
        $this->assertSame('Euis Komariah', Letter::query()->findOrFail($letterId)->payload['ibu_nama']);
        // Nenek juga cukup tua untuk dipilih; pemohon yang menentukan.
        $this->submit([...$this->payload(), 'ibu' => $grandmother->id])->assertCreated();
    }

    public function test_the_father_in_the_same_family_acknowledges_with_his_own_data(): void
    {
        $father = $this->makeCitizenAccount($this->village, Rt::query()->find($this->child->rt_id), 'warga', [
            'name' => 'Asep Kurnia',
            'nik' => '3207240202940003',
            'family_id' => $this->mother['citizen']->family_id,
            'family_role' => 'suami',
            'gender' => 'L',
            'place_of_birth' => 'Tasikmalaya',
            'date_of_birth' => '1994-02-02',
        ]);
        $own = [
            'anak' => $this->child->id,
            'no_akta_lahir_anak' => '3207-LT-15032020-0001',
            'ibu' => $this->mother['citizen']->id,
            'pemohon_ayah' => 'ya',
            'ada_penetapan' => 'tidak',
            'nik_saksi_1' => '3207010101800001',
            'nama_saksi_1' => 'Saksi Satu',
            'nik_saksi_2' => '3207010101800002',
            'nama_saksi_2' => 'Saksi Dua',
        ];

        $letterId = $this->actingAs($father['user'])->postJson('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F08')->value('id'),
            'payload' => $own,
        ])->assertCreated()->json('data.id');

        // Data ayah dari akun pemohon; tidak perlu diketik.
        $payload = Letter::query()->findOrFail($letterId)->payload;
        $this->assertSame('3207240202940003', $payload['nik_ayah']);
        $this->assertSame('Asep Kurnia', $payload['nama_ayah']);
        $this->assertArrayNotHasKey('tempat_lahir_ayah', $payload);

        // Ayah tidak boleh menjadi saksinya sendiri.
        $this->actingAs($father['user'])->postJson('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F08')->value('id'),
            'payload' => [...$own, 'nik_saksi_1' => '3207240202940003'],
        ])->assertJsonValidationErrors('payload.nik_saksi_1');

        $this->actingAs($this->rtApprover['user'])
            ->patchJson("/api/rt/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();
        $this->actingAs($this->kades['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();
        $rendered = null;
        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('download')->once()->andReturn(new Response('', 200));
        Pdf::shouldReceive('loadView')->once()->with('pdf.templates.digital', Mockery::on(function (array $data) use (&$rendered): bool {
            $rendered = $data['template'];

            return true;
        }))->andReturn($pdf);
        $this->actingAs($father['user'])->get("/api/letters/{$letterId}/download?template=digital&document=f2_10")->assertOk();

        $this->assertStringContainsString('>Asep Kurnia<', $rendered);
        $this->assertStringContainsString('Tasikmalaya, 02 Februari 1994', $rendered);
    }

    public function test_the_typed_father_must_be_born_before_the_child(): void
    {
        $this->submit([...$this->payload(), 'tanggal_lahir_ayah' => '2021-01-01'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.tanggal_lahir_ayah' => 'Tanggal Lahir Ayah tidak boleh sesudah tanggal lahir anak.']);
        $this->submit([...$this->payload(), 'tanggal_akta_lahir' => '2019-01-01'])
            ->assertJsonValidationErrors('payload.tanggal_akta_lahir');
    }

    public function test_kasi_sets_the_father_of_the_child(): void
    {
        $letterId = $this->approve($this->payload());
        $resultId = $this->actingAs($this->mother['user'])
            ->post("/api/letters/{$letterId}/results", [
                'files' => [UploadedFile::fake()->create('akta.pdf', 100, 'application/pdf')],
            ], ['Accept' => 'application/json'])
            ->json('data.id');
        $this->actingAs($this->kasi['user'])
            ->patchJson("/api/letters/{$letterId}/results/{$resultId}", ['decision' => 'accepted'])
            ->assertOk();

        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letterId}/fulfillment")
            ->assertJsonPath('data.action', 'update_citizen')
            ->assertJsonPath('data.subject.name', 'Raka Pratama')
            ->assertJsonPath('data.fields.0.proposed', 'Dadan Ramdani')
            ->assertJsonPath('data.fields.1.fixed', true)
            ->assertJsonPath('data.fields.1.display', 'Dadan Ramdani');
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment/preview", ['values' => [], 'subject_nik' => '3207241503200001'])
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Raka Pratama')
            ->assertJsonPath('data.0.changes', [
                ['column' => 'father_id', 'label' => 'Data Ayah (warga desa)', 'old' => '-', 'new' => 'Dadan Ramdani'],
                ['column' => 'father_name_text', 'label' => 'Nama Ayah', 'old' => '-', 'new' => 'Dadan Ramdani'],
            ]);
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => [], 'subject_nik' => '3207241503200001'])
            ->assertOk();

        $child = $this->child->fresh();
        $this->assertSame('Dadan Ramdani', $child->father_name_text);
        $this->assertSame($this->father->id, $child->father_id);
        // KK anak tidak berubah.
        $this->assertSame($this->mother['citizen']->family_id, $child->family_id);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        return [
            'anak' => $this->child->id,
            'no_akta_lahir_anak' => '3207-LT-15032020-0001',
            'tanggal_akta_lahir' => '2020-04-01',
            'dinas_akta_lahir' => 'Disdukcapil Kab. Pangandaran',
            'ibu' => $this->mother['citizen']->id,
            'tanggal_perkawinan_agama' => '2019-06-01',
            'nik_ayah' => '3207240101950001',
            'nama_ayah' => 'Diabaikan, dari data penduduk',
            'tempat_lahir_ayah' => 'Ciamis',
            'tanggal_lahir_ayah' => '1995-01-01',
            'pekerjaan_ayah' => (string) $this->farmer->id,
            'alamat_ayah' => 'Dusun Budiasih RT 002 RW 019',
            'ada_penetapan' => 'tidak',
            'nik_saksi_1' => '3207010101800001',
            'nama_saksi_1' => 'Saksi Satu',
            'nik_saksi_2' => '3207010101800002',
            'nama_saksi_2' => 'Saksi Dua',
        ];
    }

    private function boxes(string $value): string
    {
        return '/'.implode('<\/td><td class=x\d+>', array_map(fn (string $char): string => preg_quote($char, '/'), str_split($value))).'/';
    }

    private function submit(array $payload)
    {
        return $this->actingAs($this->mother['user'])->postJson('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F08')->value('id'),
            'payload' => $payload,
        ]);
    }

    private function approve(array $payload): string
    {
        $letterId = $this->submit($payload)->assertCreated()->json('data.id');

        $this->actingAs($this->rtApprover['user'])
            ->patchJson("/api/rt/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();
        $this->actingAs($this->kades['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();

        return $letterId;
    }

    private function render(string $letterId, ?string $document): string
    {
        $rendered = null;
        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('download')->once()->andReturn(new Response('', 200));
        Pdf::shouldReceive('loadView')
            ->once()
            ->with('pdf.templates.digital', Mockery::on(function (array $data) use (&$rendered): bool {
                $rendered = $data['template'];

                return true;
            }))
            ->andReturn($pdf);

        $query = $document === null ? '' : "&document={$document}";
        $this->actingAs($this->mother['user'])
            ->get("/api/letters/{$letterId}/download?template=digital{$query}")
            ->assertOk();

        return (string) $rendered;
    }
}
