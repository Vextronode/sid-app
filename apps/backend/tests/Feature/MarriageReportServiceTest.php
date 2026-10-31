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
 * F07 Pelaporan Perkawinan/Perceraian: F-1.06 status perkawinan (utama) dan
 * F-1.02 perubahan KK selalu terbit; F-2.01 hanya bagi selain Islam yang
 * aktanya belum terbit (Islam dicatat KUA/Pengadilan Agama); F-1.05 bila
 * belum tercatat, dan F-2.04 bila perlu pernyataan pasangan suami istri.
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

    public function test_husband_reports_a_non_islamic_marriage_for_civil_registration(): void
    {
        $letterId = $this->approve($this->husband, [
            ...$this->marriage(),
            'peran_pemohon' => 'suami',
            // Diabaikan: data suami diambil dari akun pemohon.
            'nik_suami' => '3207240101950099',
            'nik_istri' => '3207246202970002',
            'status_kawin_belum_tercatat' => 'tidak',
            // Tidak ditanyakan: akta dibuat dari F-2.01 ini.
            'no_buku_nikah' => 'Tidak tersimpan',
            'istri_ke' => '2',
            'jumlah_anak' => '3',
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
        $this->assertArrayNotHasKey('no_buku_nikah', $payload);
        // Beda KK (No. KK suami dan istri berbeda).
        $this->assertSame('tidak', $payload['pasangan_satu_kk']);
        $this->assertNull(Letter::query()->findOrFail($letterId)->letter_number);
        $this->actingAs($this->husband['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_02', 'f2_01']);

        // Status sebelum kawin dari data penduduk (suami = pemohon).
        $this->assertSame('belum_kawin', $payload['status_kawin_suami']);
        $this->assertSame('kawin', $payload['status_kawin_istri']);

        // F-2.01: jenis perkawinan, agama, dan status sebelum kawin suami
        // (Belum Kawin) dan istri (Kawin) dicentang; suami dan istri sebagai subjek akta.
        $report = $this->render($letterId, 'f2_01');
        $this->assertSame(4, substr_count($report, '>X</td>'));
        $this->assertMatchesRegularExpression($this->boxes('DADAN'), $report);
        $this->assertMatchesRegularExpression($this->boxes('EUIS'), $report);
        $this->assertMatchesRegularExpression($this->boxes('ASEP'), $report);
        $this->assertMatchesRegularExpression($this->boxes('SABTU'), $report);
        // Istri ke- (poligami) dan jumlah anak.
        $this->assertStringContainsString('>2</td>', $report);
        $this->assertStringContainsString('>3</td>', $report);
        // Tanggal melapor = tanggal formulir terbit (Senin, 12 Oktober 2026).
        $this->assertMatchesRegularExpression($this->boxes('SENIN'), $report);
        $this->assertStringNotContainsString('[[', $report);

        // F-1.06: status perkawinan pemohon Belum Kawin -> Kawin; istri beda KK tidak tercantum.
        $statement = $this->render($letterId, null);
        $this->assertStringContainsString('SURAT PERNYATAAN PERUBAHAN ELEMEN DATA KEPENDUDUKAN', $statement);
        $this->assertStringContainsString('>Belum Kawin</td>', $statement);
        $this->assertStringContainsString('>Kawin</td>', $statement);
        $this->assertStringContainsString('>Pelaporan Perkawinan (F-2.01)</td>', $statement);
        $this->assertStringNotContainsString('Euis Komariah', $statement);

        // F-1.02: perubahan KK karena peristiwa penting, lampiran KK lama dan buku nikah/akta.
        $registration = $this->render($letterId, 'f1_02');
        $this->assertStringContainsString('Peristiwa Penting <b>V</b>', $registration);
        $this->assertSame(2, preg_match_all('/xf-circle>V</', $registration));

        // Terapkan: kedua pasangan warga desa menjadi Kawin.
        $this->wife['citizen']->update(['marital_status' => 'belum_kawin']);
        $this->acceptResult($letterId, $this->husband);
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => []])
            ->assertOk();
        $this->assertSame('kawin', $this->husband['citizen']->fresh()->marital_status);
        $this->assertSame('kawin', $this->wife['citizen']->fresh()->marital_status);
    }

    public function test_islamic_marriage_with_a_kua_marriage_book_only_updates_the_family_card(): void
    {
        $base = [
            'peristiwa' => 'perkawinan',
            'peran_pemohon' => 'suami',
            'nik_istri' => '3207246202970002',
            'tanggal_perkawinan' => '2026-10-10',
            'agama_perkawinan' => 'islam',
            'status_kawin_belum_tercatat' => 'tidak',
        ];

        // Dicatat KUA: No. buku nikah wajib; saksi dan orang tua tidak ditanyakan.
        $this->submit($this->husband, $base)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.no_buku_nikah')
            ->assertJsonMissingValidationErrors(['payload.nik_saksi_1', 'payload.akta_capil_terbit']);

        $letterId = $this->approve($this->husband, [...$base, 'no_buku_nikah' => '123/45/X/2026', 'nama_ayah_suami' => 'Tidak tersimpan']);
        $payload = Letter::query()->findOrFail($letterId)->payload;
        $this->assertArrayNotHasKey('nama_ayah_suami', $payload);
        $this->actingAs($this->husband['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_02']);
        $this->assertStringContainsString('Buku Nikah/Akta Perkawinan No. 123/45/X/2026', $this->render($letterId, null));

        $this->wife['citizen']->update(['marital_status' => 'belum_kawin']);
        $this->acceptResult($letterId, $this->husband);
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => []])
            ->assertOk();
        $this->assertSame('kawin', $this->wife['citizen']->fresh()->marital_status);
        $this->assertSame('123/45/X/2026', $this->wife['citizen']->fresh()->marriage_certificate_number);
    }

    public function test_wife_reports_an_islamic_divorce_with_a_husband_from_outside_the_village(): void
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
            'agama_perkawinan' => 'islam',
            'status_kawin_belum_tercatat' => 'tidak',
            'nama_pengadilan' => 'Pengadilan Agama Ciamis',
            'tanggal_putusan' => '2026-09-01',
            'no_akta_cerai' => '0789/AC/2026/PA.Cms',
            // Bagian F-2.01 tidak berlaku: dicatat Pengadilan Agama.
            'nomor_putusan' => 'Tidak tersimpan',
        ]);

        $payload = Letter::query()->findOrFail($letterId)->payload;
        $this->assertSame('Euis Komariah', $payload['nama_istri']);
        $this->assertSame('Ujang Suryana', $payload['nama_suami']);
        $this->assertSame('ya', $payload['pasangan_satu_kk']);
        $this->assertArrayNotHasKey('tanggal_perkawinan', $payload);
        $this->assertArrayNotHasKey('nomor_putusan', $payload);
        $this->actingAs($this->wife['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_02']);

        // Pasangan satu KK ikut tercantum; Kawin -> Cerai Hidup berdasar akta cerai.
        $statement = $this->render($letterId, null);
        $this->assertStringContainsString('Ujang Suryana', $statement);
        $this->assertSame(2, substr_count($statement, '>Cerai Hidup</td>'));
        $this->assertStringContainsString('Akta Cerai No. 0789/AC/2026/PA.Cms', $statement);

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
            ->assertJsonPath('data.0.changes', [
                ['column' => 'marital_status', 'label' => 'Status Perkawinan', 'old' => 'Kawin', 'new' => 'Cerai Hidup'],
                // Akta cerai dan tanggal putusan ikut tersimpan di data warga.
                ['column' => 'divorce_certificate_number', 'label' => 'No. Akta Cerai', 'old' => '-', 'new' => '0789/AC/2026/PA.Cms'],
                ['column' => 'divorce_date', 'label' => 'Tanggal Perceraian', 'old' => '-', 'new' => '1 September 2026'],
            ]);
        $this->assertSame('kawin', $this->wife['citizen']->fresh()->marital_status);

        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => []])
            ->assertOk();
        $this->assertSame('cerai_hidup', $this->wife['citizen']->fresh()->marital_status);
        $this->assertSame('0789/AC/2026/PA.Cms', $this->wife['citizen']->fresh()->divorce_certificate_number);
        $this->assertSame('2026-09-01', $this->wife['citizen']->fresh()->divorce_date->toDateString());
    }

    public function test_non_islamic_court_divorce_is_reported_on_f2_01(): void
    {
        $letterId = $this->approve($this->wife, [
            'peristiwa' => 'perceraian',
            'peran_pemohon' => 'istri',
            'nik_suami' => '3207010101900005',
            'nama_suami' => 'Ujang Suryana',
            'agama_perkawinan' => 'katolik',
            'status_kawin_belum_tercatat' => 'tidak',
            'akta_capil_terbit' => 'tidak',
            'no_akta_perkawinan' => '0456/2018',
            'nama_pengadilan' => 'Pengadilan Negeri Ciamis',
            'nomor_putusan' => '1234/Pdt.G/2026/PN.Cms',
            'tanggal_putusan' => '2026-09-01',
            ...$this->witnesses(),
        ]);

        $this->actingAs($this->wife['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_02', 'f2_01']);

        $report = $this->render($letterId, 'f2_01');
        $this->assertSame(1, substr_count($report, '>X</td>'));
        $this->assertMatchesRegularExpression($this->boxes('UJANG'), $report);
        $this->assertMatchesRegularExpression($this->boxes('1234/PDT'), $report);
        $this->assertStringContainsString(
            'Pelaporan Perceraian (F-2.01), Putusan Pengadilan Negeri Ciamis No. 1234/Pdt.G/2026/PN.Cms',
            $this->render($letterId, null),
        );
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
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_02', 'f1_05', 'f2_04']);

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

        $statement = $this->render($letterId, null);
        $this->assertStringContainsString('SPTJM Perkawinan/Perceraian Belum Tercatat (F-1.05)', $statement);
        $this->assertStringContainsString('>Kawin Belum Tercatat</td>', $statement);

        // Terapkan: kedua pasangan warga desa menjadi Kawin Belum Tercatat.
        $this->husband['citizen']->update(['marital_status' => 'belum_kawin']);
        $this->acceptResult($letterId, $this->wife);
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => []])
            ->assertOk();
        $this->assertSame('kawin_belum_tercatat', $this->husband['citizen']->fresh()->marital_status);
        $this->assertSame('kawin_belum_tercatat', $this->wife['citizen']->fresh()->marital_status);
    }

    public function test_status_before_marriage_is_asked_for_a_spouse_from_outside_the_village(): void
    {
        $payload = [
            ...$this->marriage(),
            'peran_pemohon' => 'suami',
            'nik_istri' => '3207246202970099',
            'nama_istri' => 'Neneng Hasanah',
            'status_kawin_belum_tercatat' => 'tidak',
        ];

        $this->submit($this->husband, $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.status_kawin_istri');

        $letterId = $this->approve($this->husband, [...$payload, 'status_kawin_istri' => 'cerai_mati']);
        $this->assertSame('cerai_mati', Letter::query()->findOrFail($letterId)->payload['status_kawin_istri']);
        // Jenis perkawinan, agama, suami Belum Kawin, istri Cerai Mati.
        $this->assertSame(4, substr_count($this->render($letterId, 'f2_01'), '>X</td>'));
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
            'agama_perkawinan' => 'kristen',
            'akta_capil_terbit' => 'tidak',
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
            'agama_perkawinan' => 'kristen',
            'akta_capil_terbit' => 'tidak',
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

    private function submit(array $applicant, array $payload)
    {
        return $this->actingAs($applicant['user'])->postJson('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F07')->value('id'),
            'payload' => $payload,
        ]);
    }

    private function approve(array $applicant, array $payload): string
    {
        $letterId = $this->submit($applicant, $payload)->assertCreated()->json('data.id');

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
            ->with('pdf.templates.letter', Mockery::on(function (array $data) use (&$rendered): bool {
                $rendered = $data['template'];

                return true;
            }))
            ->andReturn($pdf);

        $query = $document === null ? '' : "&document={$document}";
        $letter = Letter::query()->findOrFail($letterId);
        $this->actingAs($letter->user)
            ->get("/api/letters/{$letterId}/download?{$query}")
            ->assertOk();

        return (string) $rendered;
    }
}
