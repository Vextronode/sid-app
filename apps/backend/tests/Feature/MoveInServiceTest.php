<?php

namespace Tests\Feature;

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
 * F04 Pindah Datang: diajukan warga desa sebagai perantara untuk satu
 * pendatang. F-1.02 (utama, atas nama pendatang) + satu surat pernyataan
 * Pendatang sesuai tempat tinggal, dan F-1.01 bila membuat KK baru;
 * pendataan dikerjakan manual lalu ditandai selesai.
 */
class MoveInServiceTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $rtApprover;

    private array $kades;

    private array $kasi;

    private Occupation $farmer;

    private Rt $budiasih;

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
        $family = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218011304150001']);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'name' => 'Engkos Sutisna',
            'family_id' => $family->id,
            'family_role' => 'kepala_keluarga',
        ]);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
        $this->kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village);
        $this->budiasih = $this->makeNamedArea($this->village, 'Budiasih', '16', '1');
    }

    public function test_joining_a_family_issues_the_registration_form_and_host_family_statement(): void
    {
        $letterId = $this->approve([
            ...$this->arrival('numpang_kk'),
            'nama_kepala_keluarga' => 'Engkos Sutisna',
            'nik_kepala_keluarga' => '3207240101700001',
            'no_kk_tujuan' => '3218011304150001',
            'pekerjaan_kepala_keluarga' => (string) $this->farmer->id,
            'alamat_kepala_keluarga' => $this->budiasih->id,
            // Biodata KK baru tidak berlaku untuk numpang KK.
            'nama_ibu_pendatang' => 'Tidak tersimpan',
        ]);

        $this->assertNull(Letter::query()->findOrFail($letterId)->letter_number);
        $this->assertArrayNotHasKey('nama_ibu_pendatang', Letter::query()->findOrFail($letterId)->payload);
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'pendatang_numpang_kk']);

        // F-1.02 atas nama pendatang dan KK yang ditumpangi.
        $registration = $this->render($letterId, null);
        $this->assertStringContainsString('FORMULIR PENDAFTARAN PERISTIWA KEPENDUDUKAN', $registration);
        $this->assertStringContainsString('( Rina Marlina )', $registration);
        $this->assertStringContainsString('3207246904990002', $registration);
        $this->assertStringContainsString('3218011304150001', $registration);
        $this->assertStringNotContainsString('( Engkos Sutisna )', $registration);
        // Menumpang dalam KK, KTP-el pindah datang, SKP, dan pernyataan bersedia menerima.
        $this->assertSame(4, substr_count($registration, '>X</span>'));

        $statement = $this->render($letterId, 'pendatang_numpang_kk');
        $this->assertStringContainsString('TIDAK KEBERATAN NUMPANG KK', $statement);
        $this->assertStringContainsString('Selaku Kepala Keluarga', $statement);
        $this->assertStringContainsString('Petani', $statement);
        $this->assertStringContainsString('Rina Marlina', $statement);
        $this->assertStringContainsString('Ciamis, 29 April 1999', $statement);
        $this->assertStringContainsString('Ketua RT 001', $statement);
        $this->assertStringContainsString('Dusun Budiasih RT 001 RW 016', $statement);
        $this->assertStringContainsString('( Engkos Sutisna )', $statement);
    }

    public function test_own_home_creates_a_new_family_with_the_biodata_form(): void
    {
        $letterId = $this->approve([
            ...$this->arrival('milik_sendiri'),
            ...$this->biodata(),
        ]);

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'pendatang_alamat_sendiri', 'f1_01']);

        // Pindah datang membuat KK baru, KTP-el pindah datang, SKP.
        $this->assertSame(3, substr_count($this->render($letterId, null), '>X</span>'));
        $this->assertStringContainsString('MENGGUNAKAN ALAMAT RUMAH MILIK SENDIRI', $this->render($letterId, 'pendatang_alamat_sendiri'));

        // F-1.01 mendatar, tata letak sesuai Excel; RT/RW/kode pos per kotak.
        $biodata = $this->render($letterId, 'f1_01', landscape: true);
        $this->assertStringContainsString('FORMULIR BIODATA KELUARGA', $biodata);
        $this->assertStringContainsString('DUSUN Budiasih', $biodata);
        $this->assertMatchesRegularExpression('/>0<\/td><td class=x\d+>0<\/td><td class=x\d+>1</', $biodata);
        $this->assertStringNotContainsString('[[', $biodata);
        $this->assertStringContainsString('Perempuan', $biodata);
        $this->assertStringContainsString('Kawin', $biodata);
        $this->assertStringContainsString('AN-123', $biodata);
        $this->assertStringContainsString('Kepala Keluarga', $biodata);
        $this->assertStringContainsString('Ibu Pendatang', $biodata);
        $this->assertStringContainsString('>Rina Marlina<', $biodata);
        $this->assertStringNotContainsString('________', $biodata);
    }

    public function test_someone_elses_home_prints_the_owner_statement_and_kasi_marks_it_done(): void
    {
        $letterId = $this->approve([
            ...$this->arrival('orang_lain'),
            ...$this->biodata(),
            'jenis_tempat' => 'kontrakan',
            'nama_pemilik' => 'Haji Darman',
            'nik_pemilik' => '3207240101600003',
            'tempat_lahir_pemilik' => 'Pangandaran',
            'tanggal_lahir_pemilik' => '1960-01-01',
            'pekerjaan_pemilik' => (string) $this->farmer->id,
            'alamat_pemilik' => 'Dusun Budiasih RT 002 RW 016',
        ]);

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'pendatang_alamat_orla', 'f1_01']);

        $statement = $this->render($letterId, 'pendatang_alamat_orla');
        $this->assertStringContainsString('ALAMAT DIGUNAKAN DALAM ADMINISTRASI KEPENDUDUKAN', $statement);
        $this->assertStringContainsString('Selaku pemilik Kontrakan', $statement);
        $this->assertStringContainsString('( Haji Darman )', $statement);
        $this->assertStringContainsString('Rina Marlina', $statement);

        $resultId = $this->actingAs($this->applicant['user'])
            ->post("/api/letters/{$letterId}/results", [
                'files' => [UploadedFile::fake()->create('kk-baru.pdf', 100, 'application/pdf')],
            ], ['Accept' => 'application/json'])
            ->json('data.id');
        $this->actingAs($this->kasi['user'])
            ->patchJson("/api/letters/{$letterId}/results/{$resultId}", ['decision' => 'accepted'])
            ->assertOk();
        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letterId}/fulfillment")
            ->assertJsonPath('data.action', 'manual')
            ->assertJsonPath('data.instructions', fn ($text) => str_contains($text, 'Daftarkan pendatang'));
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => [], 'notes' => 'Rina sudah diinput'])
            ->assertOk();

        $this->assertNotNull(Letter::query()->findOrFail($letterId)->fulfilled_at);
    }

    /**
     * @return array<string, mixed>
     */
    private function arrival(string $residence): array
    {
        return [
            'tempat_tinggal' => $residence,
            'nama_pendatang' => 'Rina Marlina',
            'nik_pendatang' => '3207246904990002',
            'tempat_lahir_pendatang' => 'Ciamis',
            'tanggal_lahir_pendatang' => '1999-04-29',
            'agama_pendatang' => 'islam',
            'pekerjaan_pendatang' => (string) $this->farmer->id,
            'alamat_pendatang' => $this->budiasih->id,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function biodata(): array
    {
        return [
            'jenis_kelamin_pendatang' => 'P',
            'pendidikan_pendatang' => 'sma',
            'no_akta_lahir' => 'AN-123',
            'status_kawin_pendatang' => 'kawin',
            'nama_ibu_pendatang' => 'Ibu Pendatang',
            'nama_ayah_pendatang' => 'Ayah Pendatang',
        ];
    }

    private function approve(array $payload): string
    {
        $letterId = $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => LetterType::query()->where('code', 'F04')->value('id'),
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
