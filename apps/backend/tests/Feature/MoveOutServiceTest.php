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
 * F03 Pindah Keluar: F-1.03 (utama, semua bagian formulir asli selalu
 * tercetak), dan F-1.02 bila ada anggota KK yang tetap tinggal; setelah
 * surat pindah diunggah dan diterima, Terapkan menonaktifkan anggota yang
 * pindah. Orang asing (SKTT) diajukan warga sebagai perantara.
 */
class MoveOutServiceTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $rtApprover;

    private array $kades;

    private array $kasi;

    private Citizen $child;

    private Citizen $wife;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');
        $this->travelTo(now()->setDate(2026, 10, 12)->setTime(9, 0));

        $this->village = Village::factory()->create(['name' => 'Desa Cibenda', 'district' => 'Parigi', 'regency' => 'Pangandaran']);
        $this->seed([ApprovalFlowSeeder::class, ServiceLetterTypeSeeder::class]);

        ['rt' => $rt] = $this->makeArea($this->village);
        $family = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218011304150001']);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'name' => 'Asep Hidayat',
            'nik' => '3207241105800001',
            'family_id' => $family->id,
            'family_role' => 'kepala_keluarga',
            'date_of_birth' => '1980-05-11',
        ]);
        $this->wife = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'name' => 'Iis Nurhayati',
            'family_id' => $family->id,
            'family_role' => 'istri',
            'date_of_birth' => '1984-01-02',
        ]);
        $this->child = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'name' => 'Asti Nurfadilah',
            'nik' => '3207246904070001',
            'family_id' => $family->id,
            'family_role' => 'anak',
            'date_of_birth' => '2007-04-29',
        ]);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
        $this->kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village);
    }

    public function test_member_move_lists_the_movers_and_issues_the_registration_form(): void
    {
        $letterId = $this->approve($this->payload());

        $this->assertNull(Letter::query()->findOrFail($letterId)->letter_number);
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_02']);

        $main = $this->render($letterId, null);
        $this->assertStringContainsString('FORMULIR PENDAFTARAN PERPINDAHAN PENDUDUK', $main);
        $this->assertStringContainsString('3218011304150001', $main);
        $this->assertStringContainsString('JL. H. NIMING NO. 5', $main);
        $this->assertStringContainsString('Jakarta Barat', $main);
        $this->assertStringContainsString('Asti Nurfadilah', $main);
        $this->assertStringContainsString('3207246904070001', $main);
        $this->assertStringNotContainsString('Iis Nurhayati', $main);
        // Bagian orang asing dan SKPLN tetap tercetak, tetapi kosong.
        $this->assertStringContainsString('Nama Sponsor', $main);
        $this->assertStringContainsString('Negara Tujuan', $main);
        $this->assertStringNotContainsString('________', $main);
        // Jenis permohonan, klasifikasi, alasan, jenis kepindahan, dan dua status KK.
        $this->assertSame(6, substr_count($main, '>X</span>'));
        $this->assertStringContainsString('Cibenda, 12 Oktober 2026', $main);

        // Hanya anggota yang pindah: perubahan KK + KK lama, tanpa ganti kepala.
        $this->assertSame(2, substr_count($this->render($letterId, 'f1_02'), '>X</span>'));
    }

    public function test_whole_family_abroad_move_prints_skpln_and_skips_the_registration_form(): void
    {
        $letterId = $this->approve([
            'kewarganegaraan' => 'wni',
            'jenis_permohonan' => 'skpln',
            'negara_tujuan' => 'Malaysia',
            'alamat_luar_negeri' => 'Jalan Ampang 10, Kuala Lumpur',
            'penanggung_jawab' => 'Ujang',
            'rencana_tanggal_pindah' => '2026-11-01',
            'alasan_pindah' => 'lainnya',
            'alasan_lainnya' => 'Ikut suami bekerja',
            'jenis_kepindahan' => 'kk_seluruh',
            // Isian alamat dalam negeri tersembunyi untuk SKPLN.
            'alamat_tujuan' => 'Tidak tersimpan',
            'status_tidak_pindah' => 'numpang_kk',
            'status_pindah' => 'kk_baru',
            'anggota_pindah' => [$this->applicant['citizen']->id, $this->wife->id, $this->child->id],
        ]);

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main']);
        $payload = Letter::query()->findOrFail($letterId)->payload;
        $this->assertArrayNotHasKey('alamat_tujuan', $payload);
        $this->assertArrayNotHasKey('status_tidak_pindah', $payload);

        $main = $this->render($letterId, null);
        $this->assertStringContainsString('Malaysia', $main);
        $this->assertStringContainsString('1 November 2026', $main);
        $this->assertStringContainsString('Ikut suami bekerja', $main);
        // Alamat pindah dalam negeri tetap ada sebagai bagian kosong.
        $this->assertStringContainsString('Alamat Pindah', $main);
        $this->assertStringNotContainsString('Tidak tersimpan', $main);
        $this->assertStringNotContainsString('________', $main);
    }

    public function test_foreigner_move_is_submitted_by_an_intermediary_and_only_marked_done(): void
    {
        $letterId = $this->approve([
            'kewarganegaraan' => 'wna',
            // Jenis permohonan WNI tidak berlaku untuk orang asing.
            'jenis_permohonan' => 'skpln',
            'nama_wna' => 'John Smith',
            'alamat_wna' => $this->makeNamedArea($this->village, 'Sinargalih', '6', '1')->id,
            'tipe_sponsor' => 'perusahaan',
            'nama_sponsor' => 'PT Laut Biru',
            'alamat_sponsor' => 'Jl. Pantai Barat 1, Pangandaran',
            'nomor_itas' => '2C11AB1234',
            'tanggal_itas' => '2027-06-30',
            'alamat_tujuan' => 'Jl. Merdeka 8',
            'rt_tujuan' => '004',
            'rw_tujuan' => '002',
            'desa_tujuan' => 'Kuta',
            'kecamatan_tujuan' => 'Kuta',
            'kabupaten_tujuan' => 'Badung',
            'provinsi_tujuan' => 'Bali',
            'klasifikasi_pindah' => 'antar_provinsi',
            'alasan_pindah' => 'pekerjaan',
            'jenis_kepindahan' => 'kk_seluruh',
            'status_pindah' => 'numpang_kk',
            'anggota_wna' => [['nama' => 'John Smith', 'shdk' => 'Kepala Keluarga']],
        ]);

        $letter = Letter::query()->findOrFail($letterId);
        $this->assertArrayNotHasKey('jenis_permohonan', $letter->payload);
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main']);

        $main = $this->render($letterId, null);
        $this->assertStringContainsString('( John Smith )', $main);
        $this->assertStringContainsString('Dusun Sinargalih RT 001 RW 006', $main);
        $this->assertStringNotContainsString('3218011304150001', $main);
        $this->assertStringContainsString('PT Laut Biru', $main);
        $this->assertStringContainsString('2C11AB1234', $main);
        $this->assertStringContainsString('30 Juni 2027', $main);
        $this->assertStringContainsString('Badung', $main);
        // SKTT, klasifikasi, sponsor, alasan, jenis kepindahan, status KK yang pindah.
        $this->assertSame(6, substr_count($main, '>X</span>'));
        $this->assertStringNotContainsString('________', $main);

        $this->acceptResult($letterId);
        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letterId}/fulfillment")
            ->assertJsonPath('data.members', [])
            ->assertJsonPath('data.instructions', fn ($text) => str_contains($text, 'SKTT'));
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => [], 'notes' => 'SKTT terbit'])
            ->assertOk();

        $this->assertNotNull($letter->fresh()->fulfilled_at);
        $this->assertSame('SKTT terbit', $letter->fresh()->fulfillment['notes']);
        $this->assertTrue($this->applicant['citizen']->fresh()->is_active);
    }

    public function test_kasi_deactivates_the_movers_after_the_move_letter_is_accepted(): void
    {
        $letterId = $this->approve($this->payload());
        $this->acceptResult($letterId);

        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letterId}/fulfillment")
            ->assertOk()
            ->assertJsonPath('data.action', 'deactivate_members')
            ->assertJsonCount(1, 'data.members')
            ->assertJsonPath('data.members.0.name', 'Asti Nurfadilah');
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => []])
            ->assertOk();

        $this->assertFalse($this->child->fresh()->is_active);
        $this->assertTrue($this->wife->fresh()->is_active);
        $this->assertTrue($this->applicant['citizen']->fresh()->is_active);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        return [
            'kewarganegaraan' => 'wni',
            'jenis_permohonan' => 'skp',
            'alamat_tujuan' => 'JL. H. NIMING NO. 5',
            'rt_tujuan' => '002',
            'rw_tujuan' => '003',
            'desa_tujuan' => 'Srengseng',
            'kecamatan_tujuan' => 'Kembangan',
            'kabupaten_tujuan' => 'Jakarta Barat',
            'provinsi_tujuan' => 'DKI Jakarta',
            'klasifikasi_pindah' => 'antar_provinsi',
            'alasan_pindah' => 'pendidikan',
            'jenis_kepindahan' => 'anggota',
            'status_tidak_pindah' => 'numpang_kk',
            'status_pindah' => 'kk_baru',
            'anggota_pindah' => [$this->child->id],
        ];
    }

    private function acceptResult(string $letterId): void
    {
        $resultId = $this->actingAs($this->applicant['user'])
            ->post("/api/letters/{$letterId}/results", [
                'files' => [UploadedFile::fake()->create('skpwni.pdf', 100, 'application/pdf')],
            ], ['Accept' => 'application/json'])
            ->json('data.id');
        $this->actingAs($this->kasi['user'])
            ->patchJson("/api/letters/{$letterId}/results/{$resultId}", ['decision' => 'accepted'])
            ->assertOk();
    }

    private function approve(array $payload): string
    {
        $letterId = $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => LetterType::query()->where('code', 'F03')->value('id'),
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
