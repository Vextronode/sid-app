<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Letter;
use App\Models\LetterType;
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
 * Formulir Layanan Kependudukan (Fxx) hasil seeder: dirender sesuai formulir
 * Disdukcapil dan bersambung sampai data desa diperbarui.
 */
class ServiceLetterRenderingTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $rtApprover;

    private array $kades;

    private array $kasi;

    private Rt $budiasih;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');
        $this->travelTo(now()->setDate(2026, 10, 12)->setTime(9, 0));

        $this->village = Village::factory()->create([
            'name' => 'Desa Cibenda',
            'district' => 'Parigi',
            'regency' => 'Pangandaran',
            'province' => 'Jawa Barat',
            'postal_code' => '46393',
        ]);
        $this->seed([ApprovalFlowSeeder::class, ServiceLetterTypeSeeder::class]);

        ['rt' => $rt] = $this->makeArea($this->village);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', ['name' => 'Pelapor Keluarga']);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
        $this->kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village);
        $this->budiasih = $this->makeNamedArea($this->village, 'Budiasih', '19', '2');
    }

    public function test_statement_without_population_documents_follows_form_f1_04(): void
    {
        $letterId = $this->issue('F01', [
            'nama_lengkap' => 'Rosita',
            'tempat_lahir' => 'Garut',
            'tanggal_lahir' => '2021-04-05',
            'jenis_kelamin' => 'P',
            'nama_ibu' => 'Siti Aminah',
            'golongan_darah' => 'O',
            'pendidikan_terakhir' => 'tidak_sekolah',
            'alamat' => $this->budiasih->id,
            'shdk' => 'anak',
        ]);

        $this->assertNull(Letter::query()->findOrFail($letterId)->letter_number);

        $html = $this->render($letterId);
        $this->assertStringContainsString('F-1.04', $html);
        $this->assertStringContainsString('SURAT PERNYATAAN TIDAK MEMILIKI DOKUMEN KEPENDUDUKAN', $html);
        $this->assertStringContainsString('Rosita', $html);
        $this->assertStringContainsString('Garut, 5 April 2021', $html);
        $this->assertStringContainsString('Perempuan', $html);
        $this->assertStringContainsString('Siti Aminah', $html);
        $this->assertStringContainsString('Tidak/Belum Sekolah', $html);
        $this->assertStringContainsString('Dusun Budiasih RT 002 RW 019', $html);
        // Wilayah dari profil desa.
        foreach (['Cibenda', 'Parigi', 'Pangandaran', 'Jawa Barat', '46393'] as $region) {
            $this->assertStringContainsString($region, $html);
        }
        $this->assertStringContainsString('bersedia diproses secara hukum', $html);
        $this->assertStringContainsString('Pangandaran, 12 Oktober 2026', $html);
        $this->assertStringContainsString('( Rosita )', $html);
        // Tanpa nomor surat dan tanpa TTD Kepala Desa.
        $this->assertStringNotContainsString('Nomor', $html);
        $this->assertStringNotContainsString('<img', $html);
        $this->assertStringNotContainsString('________', $html);
        $this->assertStringNotContainsString('Pelapor Keluarga', $html);
    }

    public function test_kasi_previews_then_registers_the_person_into_the_applicant_family(): void
    {
        $family = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218011304150007']);
        $this->applicant['citizen']->update(['family_id' => $family->id, 'family_role' => 'kepala_keluarga']);

        $letterId = $this->issue('F01', [
            'nama_lengkap' => 'Rosita',
            'tempat_lahir' => 'Garut',
            'tanggal_lahir' => '2021-04-05',
            'jenis_kelamin' => 'P',
            'nama_ibu' => 'Siti Aminah',
            'pendidikan_terakhir' => 'sd',
            'alamat' => $this->budiasih->id,
            'shdk' => 'anak',
        ]);

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.result_stage', 'awaiting_upload')
            ->assertJsonPath('data.letter_type.category', 'pelayanan');

        $resultId = $this->actingAs($this->applicant['user'])
            ->post("/api/letters/{$letterId}/results", [
                'files' => [UploadedFile::fake()->create('kk-baru.pdf', 100, 'application/pdf')],
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($this->kasi['user'])
            ->patchJson("/api/letters/{$letterId}/results/{$resultId}", ['decision' => 'accepted'])
            ->assertOk();

        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letterId}/fulfillment")
            ->assertOk()
            ->assertJsonPath('data.action', 'create_citizen')
            ->assertJsonPath('data.fields.0.column', 'nik');

        // NIK wajib diisi dari dokumen terbitan.
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment/preview", ['values' => []])
            ->assertUnprocessable();

        // Pratinjau: daftar perubahan tanpa menyimpan apa pun.
        $preview = $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment/preview", ['values' => ['nik' => '3207014504210003']])
            ->assertOk()
            ->assertJsonPath('data.0.kind', 'create')
            ->assertJsonPath('data.0.name', 'Rosita')
            ->json('data.0.changes');
        $changes = array_column($preview, 'new', 'label');
        $this->assertSame('************0003', $changes['NIK']);
        $this->assertSame('Anak', $changes['Hubungan dalam KK']);
        $this->assertSame('Perempuan', $changes['Jenis Kelamin']);
        $this->assertSame('5 April 2021', $changes['Tanggal Lahir']);
        $this->assertSame('Dusun Budiasih, RT 002 / RW 019', $changes['RT/RW']);
        $this->assertSame('No. KK ************0007', $changes['Kartu Keluarga']);
        $this->assertSame('-', array_column($preview, 'old', 'label')['Nama']);
        $this->assertFalse(Citizen::query()->where('name', 'Rosita')->exists());
        $this->assertNull(Letter::query()->findOrFail($letterId)->fulfilled_at);

        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => ['nik' => '3207014504210003']])
            ->assertOk();

        $person = Citizen::query()->where('name', 'Rosita')->firstOrFail();
        $this->assertSame($family->id, $person->family_id);
        $this->assertSame('anak', $person->family_role->value);
        $this->assertSame($this->budiasih->id, $person->rt_id);
        $this->assertSame($this->budiasih->rw->hamlet_id, $person->hamlet_id);
        $this->assertSame('Dusun Budiasih, RT 002 / RW 019', $person->address);
        $this->assertNotNull(Letter::query()->findOrFail($letterId)->fulfilled_at);
    }

    private function issue(string $code, array $payload): string
    {
        $letterId = $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => LetterType::query()->where('code', $code)->value('id'),
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

    private function render(string $letterId): string
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

        $this->actingAs($this->applicant['user'])
            ->get("/api/letters/{$letterId}/download?template=digital")
            ->assertOk();

        return (string) $rendered;
    }
}
