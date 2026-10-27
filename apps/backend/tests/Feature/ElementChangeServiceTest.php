<?php

namespace Tests\Feature;

use App\Models\Citizen;
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
 * F02 Perubahan Elemen Data: F-1.06 (utama) + F-1.02, dan F-1.05 bila
 * perkawinan/perceraian belum tercatat; setelah KK baru diunggah dan
 * diterima, Terapkan mengubah data tiap anggota.
 */
class ElementChangeServiceTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $rtApprover;

    private array $kades;

    private array $kasi;

    private Citizen $wife;

    private Occupation $farmer;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');
        $this->travelTo(now()->setDate(2026, 10, 12)->setTime(9, 0));

        $this->village = Village::factory()->create(['name' => 'Desa Cibenda', 'district' => 'Parigi', 'regency' => 'Pangandaran']);
        $this->seed([ApprovalFlowSeeder::class, ServiceLetterTypeSeeder::class]);
        $this->farmer = Occupation::factory()->create(['village_id' => $this->village->id, 'name' => 'Petani']);

        ['rt' => $rt] = $this->makeArea($this->village);
        $family = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218011302190004']);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'name' => 'Alief Syamsudin',
            'nik' => '3207241105960002',
            'family_id' => $family->id,
            'family_role' => 'kepala_keluarga',
            'gender' => 'L',
            'marital_status' => 'belum_kawin',
            'last_education' => 'sma',
            'occupation_id' => $this->farmer->id,
            'date_of_birth' => '1996-05-11',
        ]);
        $this->wife = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'name' => 'Devitasari',
            'nik' => '3301095410990002',
            'family_id' => $family->id,
            'family_role' => 'istri',
            'gender' => 'P',
            'marital_status' => 'cerai_hidup',
            'last_education' => 'smp',
            'religion' => 'islam',
            'date_of_birth' => '1999-10-14',
        ]);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
        $this->kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village);
        $this->kasi['citizen']->update(['name' => 'Sakim Hidayat']);
    }

    public function test_forms_list_the_family_and_each_change_from_current_to_new(): void
    {
        $letterId = $this->approve($this->payload());

        $this->assertNull(Letter::query()->findOrFail($letterId)->letter_number);
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_02', 'f1_05']);

        $main = $this->render($letterId, null);
        $this->assertStringContainsString('F-1.06', $main);
        $this->assertStringContainsString('3218011302190004', $main);
        // Rincian KK pemohon.
        $this->assertStringContainsString('Devitasari', $main);
        $this->assertStringContainsString('3301095410990002', $main);
        $this->assertStringContainsString('Kepala Keluarga', $main);
        // Baris 1: status kawin Belum Kawin -> Kawin; pekerjaan "Lainnya" dirapikan.
        $this->assertStringContainsString('Belum Kawin', $main);
        $this->assertStringContainsString('Buruh Harian Lepas', $main);
        $this->assertStringContainsString('SPTJM', $main);
        // Baris 2: pendidikan SMP -> S1.
        $this->assertStringContainsString('SMP', $main);
        $this->assertStringContainsString('Ijazah S1', $main);
        $this->assertStringContainsString('Cibenda, 12 Oktober 2026', $main);
        $this->assertStringNotContainsString('________', $main);

        $registration = $this->render($letterId, 'f1_02');
        $this->assertStringContainsString('FORMULIR PENDAFTARAN PERISTIWA KEPENDUDUKAN', $registration);
        $this->assertStringContainsString('>Sakim Hidayat<', $registration);
        $this->assertStringContainsString('>Alief Syamsudin<', $registration);
        // Perubahan elemen KK, KK, KK lama, bukti, dan SPTJM tercentang.
        $this->assertSame(5, preg_match_all('/<b>V<\/b>|xf-circle>V</', $registration));

        $statement = $this->render($letterId, 'f1_05');
        $this->assertStringContainsString('PERKAWINAN/ PERCERAIAN BELUM TERCATAT', $statement);
        $this->assertStringContainsString('perkawinan sebagai suami istri, yang dilaksanakan pada 1 Oktober 2026', $statement);
        $this->assertStringContainsString('Saksi Satu', $statement);
        $this->assertStringContainsString('Anak Pertama', $statement);
    }

    public function test_recorded_marriage_issues_no_sptjm(): void
    {
        $payload = $this->payload();
        $payload['status_kawin_belum_tercatat'] = 'tidak';

        $letterId = $this->approve($payload);

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_02']);
        // Isian SPTJM tersisa tidak tersimpan.
        $this->assertArrayNotHasKey('nama_suami', Letter::query()->findOrFail($letterId)->payload);
        $this->assertSame(4, preg_match_all('/<b>V<\/b>|xf-circle>V</', $this->render($letterId, 'f1_02')));
    }

    public function test_kasi_applies_the_changes_of_every_member_after_the_new_kk_is_accepted(): void
    {
        $letterId = $this->approve($this->payload());

        $resultId = $this->actingAs($this->applicant['user'])
            ->post("/api/letters/{$letterId}/results", [
                'files' => [UploadedFile::fake()->create('kk-baru.pdf', 100, 'application/pdf')],
            ], ['Accept' => 'application/json'])
            ->json('data.id');
        $this->actingAs($this->kasi['user'])
            ->patchJson("/api/letters/{$letterId}/results/{$resultId}", ['decision' => 'accepted'])
            ->assertOk();

        $proposal = $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letterId}/fulfillment")
            ->assertOk()
            ->assertJsonPath('data.action', 'update_members')
            ->assertJsonCount(2, 'data.member_changes')
            ->assertJsonPath('data.member_changes.0.name', 'Alief Syamsudin')
            ->json('data');

        $husband = collect($proposal['member_changes'][0]['fields'])->keyBy('column');
        $this->assertSame('Belum Kawin', $husband['marital_status']['current_label']);
        $this->assertSame('kawin', $husband['marital_status']['proposed']);
        // Pekerjaan "Lainnya" belum ada di katalog: Kasi memilih dari katalog.
        $this->assertTrue($husband['occupation_id']['needs_choice']);
        $this->assertSame('Buruh Harian Lepas', $husband['occupation_id']['proposed_label']);
        $this->assertNotEmpty($proposal['options']['occupation_id']);

        $laborer = Occupation::factory()->create(['village_id' => $this->village->id, 'name' => 'Buruh Harian Lepas']);
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => [0 => ['occupation_id' => $laborer->id]]])
            ->assertOk();

        $husbandCitizen = $this->applicant['citizen']->fresh();
        $this->assertSame('kawin', $husbandCitizen->marital_status);
        $this->assertSame($laborer->id, $husbandCitizen->occupation_id);
        $this->assertSame('s1', $this->wife->fresh()->last_education->value);
        $this->assertSame('kawin', $this->wife->fresh()->marital_status);
        $this->assertCount(2, Letter::query()->findOrFail($letterId)->fulfillment['members']);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        return [
            'perubahan' => [
                [
                    'anggota' => $this->applicant['citizen']->id,
                    'pekerjaan_menjadi' => 'lainnya',
                    'pekerjaan_menjadi_lainnya' => 'buruh harian lepas',
                    'dasar_pekerjaan' => 'Surat keterangan kerja',
                    'status_kawin_menjadi' => 'kawin',
                    'dasar_status_kawin' => 'SPTJM',
                ],
                [
                    'anggota' => $this->wife->id,
                    'pendidikan_menjadi' => 's1',
                    'dasar_pendidikan' => 'Ijazah S1',
                    'status_kawin_menjadi' => 'kawin',
                    'dasar_status_kawin' => 'SPTJM',
                ],
            ],
            'status_kawin_belum_tercatat' => 'ya',
            'sptjm_peristiwa' => 'perkawinan',
            'sptjm_tanggal' => '2026-10-01',
            'nama_suami' => 'Alief Syamsudin',
            'nik_suami' => '3207241105960002',
            'nama_istri' => 'Devitasari',
            'nik_istri' => '3301095410990002',
            'nama_saksi_1' => 'Saksi Satu',
            'nik_saksi_1' => '3207010101800001',
            'nama_saksi_2' => 'Saksi Dua',
            'nik_saksi_2' => '3207010101800002',
            'sptjm_anak' => [['nama' => 'Anak Pertama', 'shdk' => 'Anak']],
        ];
    }

    private function approve(array $payload): string
    {
        $letterId = $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => LetterType::query()->where('code', 'F02')->value('id'),
                'payload' => $payload,
            ])
            ->assertCreated()
            ->json('data.id');

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
        $this->actingAs($this->applicant['user'])
            ->get("/api/letters/{$letterId}/download?template=digital{$query}")
            ->assertOk();

        return (string) $rendered;
    }
}
