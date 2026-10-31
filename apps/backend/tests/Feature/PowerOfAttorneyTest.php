<?php

namespace Tests\Feature;

use App\Models\LetterSignature;
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
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Opsi "Diurus orang lain" di semua layanan Fxx: Surat Kuasa F-1.07 ikut
 * terbit dengan pemohon sebagai pemberi kuasa.
 */
class PowerOfAttorneyTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private Rt $budiasih;

    private array $applicant;

    private array $proxy;

    private array $rtApprover;

    private array $kades;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');
        $this->travelTo(now()->setDate(2026, 10, 12)->setTime(9, 0));

        $this->village = Village::factory()->create(['name' => 'Desa Cibenda', 'district' => 'Parigi', 'regency' => 'Pangandaran']);
        $this->seed([ApprovalFlowSeeder::class, ServiceLetterTypeSeeder::class]);
        ['rt' => $rt] = $this->makeArea($this->village);
        $this->budiasih = $this->makeNamedArea($this->village, 'Budiasih', '19', '2');
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'name' => 'Engkos Sutisna', 'nik' => '3207240101700001', 'place_of_birth' => 'Ciamis', 'date_of_birth' => '1970-01-01',
        ]);
        $driver = Occupation::factory()->create(['village_id' => $this->village->id, 'name' => 'Sopir']);
        $this->proxy = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'name' => 'Dadan Ramdani', 'nik' => '3207240101950002', 'occupation_id' => $driver->id, 'address' => 'Dusun Budiasih RT 002 RW 019',
        ]);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
    }

    public function test_handled_by_the_applicant_by_default_without_a_power_of_attorney(): void
    {
        $letterId = $this->submit($this->statement())->assertCreated()->json('data.id');
        $this->approve($letterId);

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.payload.pengurusan', 'sendiri')
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_02', 'f1_01']);
    }

    public function test_village_proxy_consents_and_the_power_of_attorney_is_issued(): void
    {
        $payload = [...$this->statement(), 'pengurusan' => 'diwakilkan', 'alasan_kuasa' => 'sedang sakit'];

        // Penerima kuasa bukan pemohon sendiri.
        $this->submit([...$payload, 'nik_penerima_kuasa' => '3207240101700001'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.nik_penerima_kuasa' => 'Penerima Kuasa tidak boleh pemohon sendiri.']);

        // Warga desa: nama, pekerjaan, dan alamat tidak perlu diketik.
        $letterId = $this->submit([...$payload, 'nik_penerima_kuasa' => '3207240101950002'])->assertCreated()->json('data.id');
        $request = LetterSignature::query()->where('letter_id', $letterId)->where('slot_key', 'nik_penerima_kuasa')->firstOrFail();
        $this->assertSame('Penerima Kuasa', $request->slot_label);
        $this->actingAs($this->proxy['user'])
            ->postJson("/api/signature-requests/{$request->id}/accept", ['password' => 'Password123'])
            ->assertOk();
        $this->approve($letterId);

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_02', 'f1_01', 'f1_07'])
            ->assertJsonPath('data.payload.pekerjaan_penerima_kuasa', 'Sopir');

        $html = $this->render($letterId, 'f1_07');
        $this->assertStringContainsString('F-1.07', $html);
        $this->assertStringContainsString('SURAT KUASA DALAM PELAYANAN', $html);
        $this->assertStringContainsString('Pada hari ini Senin tanggal 12 Bulan Oktober tahun 2026 bertempat di Desa Cibenda', $html);
        // Pemberi kuasa = pemohon, penerima kuasa dari data penduduk.
        $this->assertStringContainsString('Engkos Sutisna', $html);
        $this->assertStringContainsString('Ciamis, 01 Januari 1970', $html);
        $this->assertStringContainsString('Dadan Ramdani', $html);
        $this->assertStringContainsString('3207240101950002', $html);
        $this->assertStringContainsString('Sopir', $html);
        $this->assertStringContainsString('Dusun Budiasih RT 002 RW 019', $html);
        $this->assertStringContainsString('dalam keadaan sedang sakit.', $html);
        $this->assertStringContainsString('Yang diberi kuasa,', $html);
        $this->assertStringContainsString('Yang memberi kuasa,', $html);
        $this->assertStringContainsString('( Dadan Ramdani )', $html);
        $this->assertStringContainsString('( Engkos Sutisna )', $html);
    }

    public function test_proxy_from_outside_the_village_is_typed(): void
    {
        $payload = [...$this->statement(), 'pengurusan' => 'diwakilkan', 'nik_penerima_kuasa' => '3207240101800009', 'alasan_kuasa' => 'bekerja di luar kota'];

        $this->submit($payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.nama_penerima_kuasa', 'payload.pekerjaan_penerima_kuasa', 'payload.alamat_penerima_kuasa']);

        $letterId = $this->submit([
            ...$payload,
            'nama_penerima_kuasa' => 'Ujang Sopandi',
            'pekerjaan_penerima_kuasa' => 'Wiraswasta',
            'alamat_penerima_kuasa' => 'Kp. Sukamaju, Ciamis',
        ])->assertCreated()->json('data.id');
        $this->approve($letterId);

        $html = $this->render($letterId, 'f1_07');
        $this->assertStringContainsString('Ujang Sopandi', $html);
        $this->assertStringContainsString('Kp. Sukamaju, Ciamis', $html);
        $this->assertStringContainsString('dalam keadaan bekerja di luar kota.', $html);
    }

    /**
     * F01 sebagai layanan contoh (opsi yang sama ada di semua Fxx).
     *
     * @return array<string, mixed>
     */
    private function statement(): array
    {
        return [
            'nama_lengkap' => 'Rosita',
            'tempat_lahir' => 'Garut',
            'tanggal_lahir' => '2021-04-05',
            'jenis_kelamin' => 'P',
            'nama_ibu' => 'Siti Aminah',
            'pendidikan_terakhir' => 'tidak_sekolah',
            'alamat' => $this->budiasih->id,
            'shdk' => 'anak',
        ];
    }

    private function submit(array $payload)
    {
        return $this->actingAs($this->applicant['user'])->postJson('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F01')->value('id'),
            'payload' => $payload,
        ]);
    }

    private function approve(string $letterId): void
    {
        $this->actingAs($this->rtApprover['user'])
            ->patchJson("/api/rt/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();
        $this->actingAs($this->kades['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();
    }

    private function render(string $letterId, string $document): string
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

        $this->actingAs($this->applicant['user'])
            ->get("/api/letters/{$letterId}/download?document={$document}")
            ->assertOk();

        return (string) $rendered;
    }
}
