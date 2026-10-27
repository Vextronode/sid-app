<?php

namespace Tests\Feature;

use App\Models\Family;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Occupation;
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
 * F07 Pelaporan Perkawinan/Perceraian: F-2.01 bagian perkawinan atau
 * perceraian (utama) dan F-1.06 status perkawinan; F-1.05 bila belum
 * tercatat, dan F-2.04 bila perlu pernyataan pasangan suami istri.
 * Pemohon salah satu pasangan; Terapkan mengubah status kawin suami dan
 * istri yang warga desa.
 */
class MarriageReportServiceTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $husband;

    private array $wife;

    private array $kades;

    private array $kasi;

    private array $rtApprover;

    private Occupation $farmer;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');
        $this->travelTo(now()->setDate(2026, 10, 12)->setTime(9, 0));

        $this->village = Village::factory()->create(['name' => 'Desa Cibenda', 'district' => 'Parigi', 'regency' => 'Pangandaran', 'province' => 'Jawa Barat']);
        $this->seed([ApprovalFlowSeeder::class, ServiceLetterTypeSeeder::class]);

        $rt = $this->makeNamedArea($this->village, 'Budiasih', '19', '2');
        $husbandFamily = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218011304150001']);
        $wifeFamily = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218011304150002']);
        $this->husband = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'name' => 'Dadan Ramdani',
            'nik' => '3207240101950001',
            'family_id' => $husbandFamily->id,
            'family_role' => 'kepala_keluarga',
            'gender' => 'L',
            'marital_status' => 'belum_kawin',
            'date_of_birth' => '1995-01-01',
        ]);
        $this->wife = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'name' => 'Euis Komariah',
            'nik' => '3207246202970002',
            'family_id' => $wifeFamily->id,
            'family_role' => 'anak',
            'gender' => 'P',
            'marital_status' => 'kawin',
            'date_of_birth' => '1997-02-22',
        ]);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
        $this->kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village);
        $this->farmer = Occupation::factory()->create(['village_id' => $this->village->id, 'name' => 'Petani']);
    }

    public function test_husband_reports_a_recorded_marriage_with_a_wife_from_the_village(): void
    {
        $letterId = $this->approve($this->husband, [
            ...$this->marriage(),
            'peran_pemohon' => 'suami',
            // Diabaikan: data suami diambil dari akun pemohon.
            'nik_suami' => '3207240101950099',
            'nik_istri' => '3207246202970002',
            'status_kawin_belum_tercatat' => 'tidak',
            'no_buku_nikah' => '123/45/X/2026',
            // Bagian perceraian tidak berlaku untuk perkawinan.
            'nama_pengadilan' => 'Tidak tersimpan',
        ]);

        $payload = Letter::query()->findOrFail($letterId)->payload;
        $this->assertSame('3207240101950001', $payload['nik_suami']);
        $this->assertSame('Dadan Ramdani', $payload['nama_suami']);
        $this->assertSame('3218011304150001', $payload['kk_suami']);
        $this->assertSame('Euis Komariah', $payload['nama_istri']);
        $this->assertSame('3218011304150002', $payload['kk_istri']);
        $this->assertArrayNotHasKey('nama_pengadilan', $payload);
        // Beda KK (No. KK suami dan istri berbeda).
        $this->assertSame('tidak', $payload['pasangan_satu_kk']);
        $this->assertNull(Letter::query()->findOrFail($letterId)->letter_number);
        $this->actingAs($this->husband['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_06']);

        // F-2.01: jenis perkawinan dan agama dicentang; suami dan istri sebagai subjek akta.
        $report = $this->render($letterId, null);
        $this->assertSame(2, substr_count($report, '>X</td>'));
        $this->assertMatchesRegularExpression($this->boxes('DADAN'), $report);
        $this->assertMatchesRegularExpression($this->boxes('EUIS'), $report);
        $this->assertMatchesRegularExpression($this->boxes('ASEP'), $report);
        $this->assertMatchesRegularExpression($this->boxes('SABTU'), $report);
        $this->assertStringNotContainsString('[[', $report);

        // F-1.06: status perkawinan pemohon Belum Kawin -> Kawin; istri beda KK tidak tercantum.
        $statement = $this->render($letterId, 'f1_06');
        $this->assertStringContainsString('SURAT PERNYATAAN PERUBAHAN ELEMEN DATA KEPENDUDUKAN', $statement);
        $this->assertStringContainsString('>Belum Kawin</td>', $statement);
        $this->assertStringContainsString('>Kawin</td>', $statement);
        $this->assertStringContainsString('Pelaporan Perkawinan (F-2.01), Buku Nikah/Akta No. 123/45/X/2026', $statement);
        $this->assertStringNotContainsString('Euis Komariah', $statement);

        // Terapkan: kedua pasangan warga desa menjadi Kawin.
        $this->wife['citizen']->update(['marital_status' => 'belum_kawin']);
        $this->acceptResult($letterId, $this->husband);
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => []])
            ->assertOk();
        $this->assertSame('kawin', $this->husband['citizen']->fresh()->marital_status);
        $this->assertSame('kawin', $this->wife['citizen']->fresh()->marital_status);
    }

    public function test_wife_reports_a_court_divorce_with_a_husband_from_outside_the_village(): void
    {
        $letterId = $this->approve($this->wife, [
            'peristiwa' => 'perceraian',
            'peran_pemohon' => 'istri',
            'nik_suami' => '3207010101900005',
            'nama_suami' => 'Ujang Suryana',
            // Suami masih tercatat di KK yang sama dengan pemohon.
            'kk_suami' => '3218011304150002',
            // Diabaikan: diisi sistem dari No. KK suami dan istri.
            'pasangan_satu_kk' => 'tidak',
            'status_kawin_belum_tercatat' => 'tidak',
            'no_akta_perkawinan' => '0456/2018',
            'nama_pengadilan' => 'Pengadilan Agama Ciamis',
            'nomor_putusan' => '1234/Pdt.G/2026/PA.Cms',
            'tanggal_putusan' => '2026-09-01',
            ...$this->witnesses(),
        ]);

        $payload = Letter::query()->findOrFail($letterId)->payload;
        $this->assertSame('Euis Komariah', $payload['nama_istri']);
        $this->assertSame('Ujang Suryana', $payload['nama_suami']);
        $this->assertSame('ya', $payload['pasangan_satu_kk']);
        $this->assertArrayNotHasKey('tanggal_perkawinan', $payload);

        $report = $this->render($letterId, null);
        $this->assertSame(1, substr_count($report, '>X</td>'));
        $this->assertMatchesRegularExpression($this->boxes('UJANG'), $report);
        $this->assertMatchesRegularExpression($this->boxes('1234/PDT'), $report);
        $this->assertMatchesRegularExpression($this->boxes('2026'), $report);

        // Pasangan satu KK ikut tercantum; Kawin -> Cerai Hidup berdasar putusan.
        $statement = $this->render($letterId, 'f1_06');
        $this->assertStringContainsString('Ujang Suryana', $statement);
        $this->assertSame(2, substr_count($statement, '>Cerai Hidup</td>'));
        $this->assertStringContainsString('Putusan Pengadilan Agama Ciamis No. 1234/Pdt.G/2026/PA.Cms', $statement);

        // Terapkan: status kawin istri (warga desa) menjadi Cerai Hidup; suami dari luar desa dilewati.
        $this->acceptResult($letterId, $this->wife);
        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letterId}/fulfillment")
            ->assertJsonPath('data.action', 'update_citizens')
            ->assertJsonPath('data.subjects.0.found', false)
            ->assertJsonPath('data.subjects.1.name', 'Euis Komariah')
            ->assertJsonPath('data.subjects.1.fields.0.current_label', 'Kawin')
            ->assertJsonPath('data.subjects.1.fields.0.proposed_label', 'Cerai Hidup');
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment/preview", ['values' => []])
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Euis Komariah')
            ->assertJsonPath('data.0.changes', [['column' => 'marital_status', 'label' => 'Status Perkawinan', 'old' => 'Kawin', 'new' => 'Cerai Hidup']]);
        $this->assertSame('kawin', $this->wife['citizen']->fresh()->marital_status);

        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => []])
            ->assertOk();
        $this->assertSame('cerai_hidup', $this->wife['citizen']->fresh()->marital_status);
    }

    public function test_unrecorded_marriage_issues_the_sptjm_and_the_spouse_statement(): void
    {
        $letterId = $this->approve($this->wife, [
            ...$this->marriage(),
            'peran_pemohon' => 'istri',
            'nik_suami' => '3207240101950001',
            'status_kawin_belum_tercatat' => 'ya',
            'sptjm_anak' => [['nama' => 'Raka', 'shdk' => 'Anak']],
            'perlu_sptjm_pasutri' => 'ya',
            'tempat_lahir_pasangan' => 'Ciamis',
            'tanggal_lahir_pasangan' => '1995-01-01',
            'pekerjaan_pasangan' => (string) $this->farmer->id,
            'alamat_pasangan' => 'Dusun Budiasih RT 002 RW 019',
        ]);

        $this->actingAs($this->wife['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_06', 'f1_05', 'f2_04']);

        $sptjm = $this->render($letterId, 'f1_05');
        $this->assertStringContainsString('perkawinan sebagai suami istri, yang dilaksanakan pada 10 Oktober 2026', $sptjm);
        $this->assertStringContainsString('( Dadan Ramdani )', $sptjm);
        $this->assertStringContainsString('( Euis Komariah )', $sptjm);
        $this->assertStringContainsString('Raka', $sptjm);

        $spouse = $this->render($letterId, 'f2_04');
        $this->assertStringContainsString('KEBENARAN SEBAGAI PASANGAN SUAMI ISTERI', $spouse);
        $this->assertStringContainsString('adalah suami dari :', $spouse);
        $this->assertStringContainsString('>Dadan Ramdani<', $spouse);
        $this->assertStringContainsString('Ciamis, 1 Januari 1995', $spouse);
        $this->assertStringContainsString('3218011304150002', $spouse);
        $this->assertStringContainsString('>Euis Komariah<', $spouse);

        $this->assertStringContainsString('SPTJM Perkawinan/Perceraian Belum Tercatat (F-1.05)', $this->render($letterId, 'f1_06'));
    }

    public function test_event_dates_cannot_precede_births_and_divorce_cannot_precede_marriage(): void
    {
        $submit = fn (array $payload) => $this->actingAs($this->wife['user'])->postJson('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F07')->value('id'),
            'payload' => ['nik_suami' => '3207240101950001', 'status_kawin_belum_tercatat' => 'tidak', ...$payload],
        ]);

        // Menikah sebelum suami (warga desa, dari data penduduk) lahir.
        $submit([...$this->marriage(), 'tanggal_perkawinan' => '1990-05-05'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.tanggal_perkawinan' => 'Tanggal Perkawinan/Pemberkatan tidak boleh sebelum tanggal lahir suami.']);

        // Putusan cerai sebelum perkawinannya dicatat.
        $submit([
            'peristiwa' => 'perceraian',
            'no_akta_perkawinan' => '0456/2018',
            'tanggal_akta_perkawinan' => '2018-05-05',
            'nama_pengadilan' => 'Pengadilan Agama Ciamis',
            'nomor_putusan' => '1234/Pdt.G/2026/PA.Cms',
            'tanggal_putusan' => '2017-01-01',
            ...$this->witnesses(),
        ])->assertJsonValidationErrors(['payload.tanggal_putusan' => 'Tanggal Putusan Pengadilan tidak boleh sebelum tanggal akta perkawinan.']);
    }

    public function test_the_applicant_role_follows_the_recorded_gender(): void
    {
        $submit = fn (array $applicant, array $payload) => $this->actingAs($applicant['user'])->postJson('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F07')->value('id'),
            'payload' => [...$this->marriage(), 'status_kawin_belum_tercatat' => 'tidak', ...$payload],
        ]);

        // Istri (P) tanpa memilih peran: tetap dicatat sebagai istri; pasangannya suami.
        $letterId = $submit($this->wife, ['nik_suami' => '3207240101950001'])->assertCreated()->json('data.id');
        $payload = Letter::query()->findOrFail($letterId)->payload;
        $this->assertSame('istri', $payload['peran_pemohon']);
        $this->assertSame('Euis Komariah', $payload['nama_istri']);
        $this->assertSame('Dadan Ramdani', $payload['nama_suami']);

        // Pilihan yang bertentangan dengan jenis kelamin ditimpa.
        $letterId = $submit($this->husband, ['peran_pemohon' => 'istri', 'nik_istri' => '3207246202970002'])
            ->assertCreated()
            ->json('data.id');
        $this->assertSame('suami', Letter::query()->findOrFail($letterId)->payload['peran_pemohon']);
    }

    public function test_the_applicant_and_the_spouse_cannot_be_their_own_witnesses(): void
    {
        $this->actingAs($this->wife['user'])
            ->getJson('/api/profile/nik-lookup?nik=3207246202970002')
            ->assertJsonPath('data.is_self', true);

        $submit = fn (array $witnesses) => $this->actingAs($this->wife['user'])->postJson('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F07')->value('id'),
            'payload' => [
                ...$this->marriage(),
                'peran_pemohon' => 'istri',
                'nik_suami' => '3207240101950001',
                'status_kawin_belum_tercatat' => 'tidak',
                ...$witnesses,
            ],
        ]);

        // Pemohon (istri) sendiri.
        $submit(['nik_saksi_1' => '3207246202970002'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.nik_saksi_1' => 'Saksi tidak boleh pemohon sendiri.']);
        // Suaminya, dan saksi yang sama dua kali.
        $submit(['nik_saksi_2' => '3207240101950001'])
            ->assertJsonValidationErrors(['payload.nik_saksi_2' => 'Saksi tidak boleh orang yang sama dengan NIK Suami.']);
        $submit(['nik_saksi_2' => '3207010101800001'])
            ->assertJsonValidationErrors('payload.nik_saksi_2');
    }

    /**
     * @return array<string, mixed>
     */
    private function marriage(): array
    {
        return [
            'peristiwa' => 'perkawinan',
            'tanggal_perkawinan' => '2026-10-10',
            'agama_perkawinan' => 'islam',
            'nama_ayah_suami' => 'Asep Sunandar',
            'nama_ibu_suami' => 'Iis Aisah',
            'nama_ayah_istri' => 'Odang Sudrajat',
            'nama_ibu_istri' => 'Enok Rohayati',
            ...$this->witnesses(),
        ];
    }

    /**
     * @return array<string, string>
     */
    private function witnesses(): array
    {
        return [
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

    private function acceptResult(string $letterId, array $applicant): void
    {
        $resultId = $this->actingAs($applicant['user'])
            ->post("/api/letters/{$letterId}/results", [
                'files' => [UploadedFile::fake()->create('akta.pdf', 100, 'application/pdf')],
            ], ['Accept' => 'application/json'])
            ->json('data.id');
        $this->actingAs($this->kasi['user'])
            ->patchJson("/api/letters/{$letterId}/results/{$resultId}", ['decision' => 'accepted'])
            ->assertOk();
    }

    private function approve(array $applicant, array $payload): string
    {
        $letterId = $this->actingAs($applicant['user'])->postJson('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F07')->value('id'),
            'payload' => $payload,
        ])->assertCreated()->json('data.id');

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
        $letter = Letter::query()->findOrFail($letterId);
        $this->actingAs($letter->user)
            ->get("/api/letters/{$letterId}/download?template=digital{$query}")
            ->assertOk();

        return (string) $rendered;
    }
}
