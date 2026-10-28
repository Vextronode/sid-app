<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\User;
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
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * F06 Pelaporan Kematian: F-2.01 bagian kematian (utama), dan F-1.02 +
 * F-1.01 (susunan KK tanpa almarhum) bila almarhum kepala keluarga;
 * Terapkan menonaktifkan almarhum beserta akunnya.
 */
class DeathReportServiceTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $father;

    private array $rtApprover;

    private array $kades;

    private array $kasi;

    private Citizen $mother;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');
        $this->travelTo(now()->setDate(2026, 10, 12)->setTime(9, 0));

        $this->village = Village::factory()->create(['name' => 'Desa Cibenda', 'district' => 'Parigi', 'regency' => 'Pangandaran', 'province' => 'Jawa Barat']);
        $this->seed([ApprovalFlowSeeder::class, ServiceLetterTypeSeeder::class]);

        $rt = $this->makeNamedArea($this->village, 'Budiasih', '19', '2');
        $family = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218011304150001']);
        $member = fn (array $attributes): array => ['village_id' => $this->village->id, 'rt_id' => $rt->id, 'family_id' => $family->id, ...$attributes];

        $this->father = $this->makeCitizenAccount($this->village, $rt, 'warga', $member([
            'name' => 'Tatang Sutisna',
            'nik' => '3207240101600001',
            'family_role' => 'kepala_keluarga',
            'gender' => 'L',
            'date_of_birth' => '1960-01-01',
            'mother_name_text' => 'Enok',
        ]));
        $this->mother = Citizen::factory()->create($member([
            'name' => 'Iis Nurhayati',
            'family_role' => 'istri',
            'gender' => 'P',
            'date_of_birth' => '1965-02-02',
            'marital_status' => 'kawin',
        ]));
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', $member([
            'name' => 'Asep Hidayat',
            'family_role' => 'anak',
            'gender' => 'L',
            'date_of_birth' => '1990-03-03',
        ]));
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
        $this->kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village);
    }

    public function test_death_of_a_member_prints_the_death_section_of_f2_01(): void
    {
        $letterId = $this->approve([...$this->payload(), 'almarhum' => $this->mother->id]);

        $this->assertNull(Letter::query()->findOrFail($letterId)->letter_number);
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main']);

        $form = $this->render($letterId, null);
        $this->assertMatchesRegularExpression($this->boxes('IIS'), $form);
        $this->assertMatchesRegularExpression($this->boxes('1500'), $form);
        $this->assertMatchesRegularExpression($this->boxes('RSUD'), $form);
        // Jenis Kematian, sebab sakit, dan yang menerangkan dokter.
        $this->assertSame(3, substr_count($form, '>X</td>'));
        $this->assertStringNotContainsString('[[', $form);
        // Belum ada yang punya TTD: tidak ada tempelan TTD sama sekali.
        $this->assertStringNotContainsString('<img', $form);
        $this->assertStringNotContainsString('tanda_tangan', $form);
    }

    public function test_village_code_and_linked_parents_of_the_deceased_fill_the_forms(): void
    {
        $this->village->update(['code' => '3218032001']);
        $this->father['citizen']->update(['place_of_birth' => 'Ciamis']);
        $child = Citizen::factory()->create([
            'village_id' => $this->village->id, 'rt_id' => $this->applicant['citizen']->rt_id, 'family_id' => $this->applicant['citizen']->family_id,
            'name' => 'Rina Sutisna', 'family_role' => 'anak', 'gender' => 'P', 'date_of_birth' => '2000-04-04',
            'father_id' => $this->father['citizen']->id, 'mother_id' => $this->mother->id,
        ]);

        // F-2.01: kode wilayah 8 kotak (provinsi, kabupaten, kecamatan, desa)
        // dan data orang tua almarhum yang tertaut di data penduduk.
        $form = $this->render($this->approve([...$this->payload(), 'almarhum' => $child->id]), null);
        $this->assertMatchesRegularExpression($this->boxes('32180301'), $form);
        $this->assertMatchesRegularExpression($this->boxes('TATANG'), $form);
        $this->assertMatchesRegularExpression($this->boxes('3207240101600001'), $form);
        $this->assertMatchesRegularExpression($this->boxes('CIAMIS'), $form);
        $this->assertMatchesRegularExpression($this->boxes('1960'), $form);
        $this->assertMatchesRegularExpression($this->boxes('INDONESIA'), $form);
        $this->assertMatchesRegularExpression($this->boxes('IIS'), $form);
        $this->assertMatchesRegularExpression($this->boxes('1965'), $form);

        // F-1.01 (kepala keluarga meninggal): golongan darah, NIK ayah/ibu,
        // dan email pemohon dari data yang ada.
        $this->applicant['citizen']->update([
            'blood_type' => 'AB', 'father_id' => $this->father['citizen']->id, 'mother_id' => $this->mother->id,
            // Dokumen & keterangan tambahan dari data warga.
            'title_back' => 'S.Kom.', 'birth_certificate_number' => '3207-LT-03031990-0007', 'has_disorder' => true, 'disability' => 'Tuna rungu',
        ]);
        $this->applicant['user']->update(['email' => 'asep@example.test']);
        $letterId = $this->approve([...$this->payload(), 'almarhum' => $this->father['citizen']->id, 'kepala_baru' => $this->mother->id]);
        $biodata = $this->render($letterId, 'f1_01', landscape: true);
        $this->assertStringContainsString('>AB</td>', $biodata);
        $this->assertStringContainsString('>3207240101600001</td>', $biodata);
        $this->assertStringContainsString('asep@example.test', $biodata);
        $this->assertStringContainsString('>S.Kom.</td>', $biodata);
        $this->assertStringContainsString('>3207-LT-03031990-0007</td>', $biodata);
        $this->assertStringContainsString('>Tuna rungu</td>', $biodata);
        $this->assertSame(2, substr_count($biodata, '>Ada</td>'));
    }

    public function test_death_cannot_precede_the_birth_of_the_deceased(): void
    {
        $this->submit([...$this->payload(), 'almarhum' => $this->mother->id, 'tanggal_kematian' => '1960-01-01'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.tanggal_kematian' => 'Tanggal Kematian tidak boleh sebelum tanggal lahir almarhum.']);
    }

    public function test_signatures_of_the_applicant_and_village_officials_are_pasted_when_final(): void
    {
        $this->uploadSignature($this->applicant['user']);
        // TTD akun Kasi Pemerintahan disalin ke jabatannya; TTD Kades diunggah Staf SID.
        $this->uploadSignature($this->kasi['user']);
        $kadesPath = "official-signatures/{$this->village->id}/{$this->kades['official']->id}/ttd.png";
        Storage::disk('private_uploads')->put($kadesPath, UploadedFile::fake()->image('ttd.png', 200, 80)->getContent());
        $this->kades['official']->update(['signature_img' => $kadesPath]);

        $letterId = $this->approve([...$this->payload(), 'almarhum' => $this->father['citizen']->id, 'kepala_baru' => $this->mother->id]);
        // TTD dibekukan saat final approve: Kasi yang mengganti TTD tidak mengubah formulir.
        $this->kasi['official']->update(['signature_img' => null]);

        // F-2.01: pelapor (pemohon) dan Kepala Desa yang mengetahui.
        $report = $this->render($letterId, null);
        $this->assertSame(2, substr_count($report, '<img'));
        $this->assertStringContainsString('data:image/png;base64,', $report);
        $this->assertStringContainsString($kadesPath, $report);
        $this->assertStringContainsString('( '.$this->kades['citizen']->name.' )', $report);

        // F-1.02: petugas Kasi Pemerintahan dan pemohon.
        $registration = $this->render($letterId, 'f1_02');
        $this->assertSame(2, substr_count($registration, '<img'));
        $this->assertStringContainsString("official-signatures/{$this->village->id}/{$this->kasi['official']->id}/", $registration);

        // F-1.01: kepala keluarga baru (ibu, tanpa akun) tidak ditempeli TTD.
        $this->assertStringNotContainsString('<img', $this->render($letterId, 'f1_01', landscape: true));
    }

    public function test_death_of_the_family_head_requires_a_new_head_and_issues_the_new_family_forms(): void
    {
        $this->submit([...$this->payload(), 'almarhum' => $this->father['citizen']->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.kepala_baru');
        // Pemohon tidak dapat melaporkan kematiannya sendiri.
        $this->submit([...$this->payload(), 'almarhum' => $this->applicant['citizen']->id])
            ->assertJsonValidationErrors('payload.almarhum');

        $letterId = $this->approve([...$this->payload(), 'almarhum' => $this->father['citizen']->id, 'kepala_baru' => $this->mother->id]);

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_02', 'f1_01']);

        $this->assertMatchesRegularExpression($this->boxes('ENOK'), $this->render($letterId, null));

        $biodata = $this->render($letterId, 'f1_01', landscape: true);
        $this->assertStringContainsString('FORMULIR BIODATA KELUARGA', $biodata);
        // Ibu menjadi kepala keluarga dan baris pertama; almarhum tidak tercantum.
        $this->assertMatchesRegularExpression('/>1<\/td><td[^>]*>Iis Nurhayati</', $biodata);
        $this->assertMatchesRegularExpression('/Kepala Keluarga<\/td>/', $biodata);
        $this->assertStringContainsString('Asep Hidayat', $biodata);
        $this->assertStringNotContainsString('Tatang Sutisna', $biodata);
        $this->assertStringContainsString('>2</td><td class=x', $biodata);
        $this->assertStringNotContainsString('________', $biodata);
    }

    public function test_new_head_is_ignored_when_the_deceased_is_not_the_family_head(): void
    {
        $letterId = $this->approve([...$this->payload(), 'almarhum' => $this->mother->id, 'kepala_baru' => $this->applicant['citizen']->id]);

        $this->assertArrayNotHasKey('kepala_baru', Letter::query()->findOrFail($letterId)->payload);
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main']);
    }

    public function test_witness_name_comes_from_the_population_data_when_the_nik_is_registered(): void
    {
        $witnessFamily = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218010101900009']);
        $witness = Citizen::factory()->create(['village_id' => $this->village->id, 'family_id' => $witnessFamily->id, 'name' => 'Ujang Saksi', 'nik' => '3207010101800009']);

        $this->actingAs($this->applicant['user'])
            ->getJson('/api/profile/nik-lookup?nik=3207010101800009')
            ->assertOk()
            ->assertJsonPath('data', ['found' => true, 'has_account' => false, 'name' => 'Ujang Saksi', 'family_number' => '3218010101900009', 'is_self' => false]);
        $this->actingAs($this->applicant['user'])
            ->getJson('/api/profile/nik-lookup?nik=3207010101800099')
            ->assertJsonPath('data', ['found' => false, 'has_account' => false, 'name' => null, 'family_number' => null, 'is_self' => false]);
        $this->actingAs($this->applicant['user'])->getJson('/api/profile/nik-lookup?nik=123')->assertUnprocessable();

        // Warga nonaktif (mis. almarhum) hanya ditemukan bila diminta.
        $witness->update(['is_active' => false]);
        $this->actingAs($this->applicant['user'])
            ->getJson('/api/profile/nik-lookup?nik=3207010101800009')
            ->assertJsonPath('data.found', false);
        $this->actingAs($this->applicant['user'])
            ->getJson('/api/profile/nik-lookup?nik=3207010101800009&include_inactive=1')
            ->assertJsonPath('data.found', true)
            ->assertJsonPath('data.name', 'Ujang Saksi');
        $witness->update(['is_active' => true]);

        // NIK terdaftar: nama dan No. KK diambil dari data penduduk.
        $payload = [...$this->payload(), 'almarhum' => $this->mother->id, 'nik_saksi_1' => $witness->nik, 'nama_saksi_1' => 'Nama Lain'];
        $letterId = $this->submit($payload)->assertCreated()->json('data.id');
        $stored = Letter::query()->findOrFail($letterId)->payload;
        $this->assertSame('Ujang Saksi', $stored['nama_saksi_1']);
        $this->assertSame('3218010101900009', $stored['kk_saksi_1']);

        // NIK tidak terdaftar: nama wajib diketik.
        $this->submit([...$this->payload(), 'almarhum' => $this->mother->id, 'nama_saksi_2' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.nama_saksi_2');
    }

    public function test_kasi_deactivates_the_deceased_and_sets_the_new_family_head_after_the_death_certificate_is_accepted(): void
    {
        $letterId = $this->approve([
            ...$this->payload(),
            'almarhum' => $this->father['citizen']->id,
            'kepala_baru' => $this->mother->id,
            'telepon_keluarga' => '081298765432',
            // Data tambahan anggota: tercetak di F-1.01 dan disimpan saat Terapkan.
            'data_tambahan' => [['anggota' => $this->applicant['citizen']->id, 'gelar_belakang' => 'S.T.', 'no_akta_lahir' => '3207-LT-03031990-0009']],
        ]);
        $biodata = $this->render($letterId, 'f1_01', landscape: true);
        $this->assertStringContainsString('>S.T.</td>', $biodata);
        $this->assertStringContainsString('>3207-LT-03031990-0009</td>', $biodata);
        $this->assertMatchesRegularExpression($this->boxes('0812'), $biodata);

        $resultId = $this->actingAs($this->applicant['user'])
            ->post("/api/letters/{$letterId}/results", [
                'files' => [UploadedFile::fake()->create('akta-kematian.pdf', 100, 'application/pdf')],
            ], ['Accept' => 'application/json'])
            ->json('data.id');
        $this->actingAs($this->kasi['user'])
            ->patchJson("/api/letters/{$letterId}/results/{$resultId}", ['decision' => 'accepted'])
            ->assertOk();

        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letterId}/fulfillment")
            ->assertJsonPath('data.action', 'deactivate_members')
            ->assertJsonPath('data.members.0.name', 'Tatang Sutisna')
            ->assertJsonPath('data.new_head', ['name' => 'Iis Nurhayati', 'family_role' => 'Istri']);
        // Pratinjau untuk pop up konfirmasi; belum ada yang berubah.
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment/preview", ['values' => []])
            ->assertOk()
            ->assertJsonPath('data.0.kind', 'deactivate')
            ->assertJsonPath('data.0.changes', [
                ['column' => 'is_active', 'label' => 'Status Data Warga', 'old' => 'Aktif', 'new' => 'Nonaktif'],
                ['column' => 'account_is_active', 'label' => 'Akun Login', 'old' => 'Aktif', 'new' => 'Nonaktif'],
            ])
            // Ibu (pilihan pemohon) menggantikan almarhum sebagai kepala keluarga.
            ->assertJsonPath('data.1.name', 'Iis Nurhayati')
            ->assertJsonPath('data.1.changes', [
                ['column' => 'family_role', 'label' => 'Hubungan dalam KK', 'old' => 'Istri', 'new' => 'Kepala Keluarga'],
            ]);
        $this->assertSame('Asep Hidayat', $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment/preview", ['values' => []])
            ->json('data.2.name'));
        $this->assertSame('istri', $this->mother->fresh()->family_role->value);
        $this->assertTrue($this->father['citizen']->fresh()->is_active);
        $this->assertTrue($this->father['user']->fresh()->is_active);
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => []])
            ->assertOk();

        $this->assertFalse($this->father['citizen']->fresh()->is_active);
        $this->assertFalse($this->father['user']->fresh()->is_active);
        $this->assertTrue($this->mother->fresh()->is_active);
        $this->assertSame('kepala_keluarga', $this->mother->fresh()->family_role->value);
        $this->assertSame('S.T.', $this->applicant['citizen']->fresh()->title_back);
        $this->assertSame('3207-LT-03031990-0009', $this->applicant['citizen']->fresh()->birth_certificate_number);
        // Nomor akta disamarkan di log aktivitas.
        $log = Activity::query()->where('event', 'letter_fulfilled')->where('subject_id', $this->applicant['citizen']->id)->firstOrFail();
        $this->assertSame('(disamarkan)', $log->properties['changes']['birth_certificate_number']['new']);
        $this->assertSame('S.T.', $log->properties['changes']['title_back']['new']);
    }

    private function uploadSignature(User $user): void
    {
        $this->actingAs($user)
            ->post('/api/profile/signature', ['signature' => UploadedFile::fake()->image('ttd.png', 200, 80)], ['Accept' => 'application/json'])
            ->assertCreated();
    }

    private function boxes(string $value): string
    {
        return '/'.implode('<\/td><td class=x\d+>', array_map(fn (string $char): string => preg_quote($char, '/'), str_split($value))).'/';
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        return [
            'tanggal_kematian' => '2026-10-05',
            'pukul_kematian' => '15:00',
            'sebab_kematian' => 'sakit',
            'tempat_kematian' => 'RSUD Pandega',
            'yang_menerangkan' => 'dokter',
            'nama_saksi_1' => 'Saksi Satu',
            'nik_saksi_1' => '3207010101800001',
            'nama_saksi_2' => 'Saksi Dua',
            'nik_saksi_2' => '3207010101800002',
        ];
    }

    private function submit(array $payload)
    {
        return $this->actingAs($this->applicant['user'])->postJson('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F06')->value('id'),
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

    private function render(string $letterId, ?string $document, bool $landscape = false): string
    {
        $rendered = null;
        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('download')->once()->andReturn(new Response('', 200));

        if ($landscape) {
            $pdf->shouldReceive('setPaper')->once()->with('a4', 'landscape')->andReturnSelf();
        }

        Pdf::shouldReceive('loadView')
            ->once()
            ->with('pdf.templates.digital', Mockery::on(function (array $data) use (&$rendered): bool {
                $rendered = $data['template'];

                return true;
            }))
            ->andReturn($pdf);

        $query = $document === null ? '' : "&document={$document}";
        $this->actingAs($this->applicant['user'])
            ->get("/api/letters/{$letterId}/download?template=digital{$query}")
            ->assertOk();

        return (string) $rendered;
    }
}
