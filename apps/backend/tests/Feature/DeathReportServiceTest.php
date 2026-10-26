<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Letter;
use App\Models\LetterType;
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
            ->assertJsonPath('data', ['found' => true, 'name' => 'Ujang Saksi', 'family_number' => '3218010101900009']);
        $this->actingAs($this->applicant['user'])
            ->getJson('/api/profile/nik-lookup?nik=3207010101800099')
            ->assertJsonPath('data', ['found' => false, 'name' => null, 'family_number' => null]);
        $this->actingAs($this->applicant['user'])->getJson('/api/profile/nik-lookup?nik=123')->assertUnprocessable();

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

    public function test_kasi_deactivates_the_deceased_and_their_account_after_the_death_certificate_is_accepted(): void
    {
        $letterId = $this->approve([...$this->payload(), 'almarhum' => $this->father['citizen']->id, 'kepala_baru' => $this->mother->id]);

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
            ->assertJsonPath('data.members.0.name', 'Tatang Sutisna');
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => []])
            ->assertOk();

        $this->assertFalse($this->father['citizen']->fresh()->is_active);
        $this->assertFalse($this->father['user']->fresh()->is_active);
        $this->assertTrue($this->mother->fresh()->is_active);
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
