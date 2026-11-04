<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Village;
use App\Support\LetterIdentityMask;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * B3/K3. NIK dan No. KK pihak lain di isian surat tampil tersamar bagi
 * semua yang membuka surat; nilai utuh dibuka lewat reveal yang tercatat
 * (kecuali oleh pemohon sendiri). PDF tetap memuat data lengkap.
 */
class LetterPayloadMaskingTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private const FATHER_NIK = '3207010101700001';

    private const MEMBER_NIK = '3207010101100002';

    private array $applicant;

    private array $rtApprover;

    private Letter $letter;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($village);
        $this->applicant = $this->makeCitizenAccount($village, $rt);
        $this->rtApprover = $this->makeOfficialUser('rt', $village, ['rt_id' => $rt->id]);
        $this->makeOfficialUser('kepala_desa', $village);
        $letterType = LetterType::factory()->create([
            'flow_id' => $this->makeDefaultFlow()->id,
            'template' => 'Surat {{ applicant_name }}',
            'supporting_template' => 'Pernyataan ayah NIK {{ nik_ayah }}',
            'form_fields' => [
                ['name' => 'nik_ayah', 'label' => 'NIK Ayah', 'type' => 'nik', 'required' => true],
                ['name' => 'jumlah_anak', 'label' => 'Jumlah Anak', 'type' => 'number', 'required' => false],
            ],
        ]);

        $letterId = $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $letterType->id,
                'payload' => ['nik_ayah' => self::FATHER_NIK, 'jumlah_anak' => 2],
            ])
            ->assertCreated()
            ->json('data.id');
        $this->letter = Letter::query()->findOrFail($letterId);
    }

    public function test_letter_api_masks_nik_values_for_every_viewer(): void
    {
        foreach ([$this->applicant['user'], $this->rtApprover['user']] as $viewer) {
            $response = $this->actingAs($viewer)
                ->getJson("/api/letters/{$this->letter->id}")
                ->assertOk()
                ->assertJsonPath('data.payload.nik_ayah', '************0001')
                ->assertJsonPath('data.payload.jumlah_anak', 2)
                ->assertJsonPath('data.masked_payload_paths', ['nik_ayah']);

            $this->assertStringNotContainsString(self::FATHER_NIK, $response->getContent());
        }
    }

    public function test_reveal_returns_the_full_value_and_logs_viewers_other_than_the_applicant(): void
    {
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$this->letter->id}/payload-identity?path=nik_ayah")
            ->assertOk()
            ->assertJsonPath('data.value', self::FATHER_NIK);
        $this->assertSame(0, Activity::query()->where('event', 'identity_viewed')->count());

        $this->actingAs($this->rtApprover['user'])
            ->getJson("/api/letters/{$this->letter->id}/payload-identity?path=nik_ayah")
            ->assertOk()
            ->assertJsonPath('data.value', self::FATHER_NIK);

        $log = Activity::query()->where('event', 'identity_viewed')->sole();
        $this->assertSame('letter', $log->log_name);
        $this->assertSame($this->rtApprover['user']->id, $log->causer_id);
        $this->assertSame($this->letter->id, $log->subject_id);
        $this->assertSame('nik_ayah', $log->properties['path']);
        $this->assertSame('NIK/No. KK isian surat (NIK Ayah)', $log->properties['field']);
    }

    public function test_reveal_is_limited_to_viewers_and_to_identity_values(): void
    {
        $outsider = $this->makeCitizenAccount(Village::factory()->create(), null);

        $this->actingAs($outsider['user'])
            ->getJson("/api/letters/{$this->letter->id}/payload-identity?path=nik_ayah")
            ->assertForbidden();
        $this->actingAs($this->rtApprover['user'])
            ->getJson("/api/letters/{$this->letter->id}/payload-identity?path=jumlah_anak")
            ->assertNotFound();
        $this->actingAs($this->rtApprover['user'])
            ->getJson("/api/letters/{$this->letter->id}/payload-identity")
            ->assertUnprocessable();

        $this->assertSame(0, Activity::query()->where('event', 'identity_viewed')->count());
    }

    public function test_pdf_still_prints_the_full_nik(): void
    {
        $rendered = null;
        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('stream')->once()->andReturn(new Response('', 200));
        Pdf::shouldReceive('loadView')
            ->once()
            ->with('pdf.templates.letter', Mockery::on(function (array $data) use (&$rendered): bool {
                $rendered = $data['template'];

                return true;
            }))
            ->andReturn($pdf);

        $this->actingAs($this->rtApprover['user'])
            ->get("/api/letters/{$this->letter->id}/supporting-document")
            ->assertOk();

        $this->assertStringContainsString(self::FATHER_NIK, $rendered);
    }

    public function test_mask_covers_nested_rows_and_leaves_other_values(): void
    {
        [$masked, $paths] = LetterIdentityMask::apply([
            'nik_ayah' => self::FATHER_NIK,
            'kk_saksi_1' => 3207010101700099,
            'nama_ayah' => 'Ahmad',
            'telepon' => '081234567890',
            'kk_pendaftaran' => [
                ['nama' => 'Anak', 'nik' => self::MEMBER_NIK],
            ],
        ]);

        $this->assertSame('************0001', $masked['nik_ayah']);
        $this->assertSame('************0099', $masked['kk_saksi_1']);
        $this->assertSame('************0002', $masked['kk_pendaftaran'][0]['nik']);
        $this->assertSame('Ahmad', $masked['nama_ayah']);
        $this->assertSame('081234567890', $masked['telepon']);
        $this->assertSame(['nik_ayah', 'kk_saksi_1', 'kk_pendaftaran.0.nik'], $paths);
        $this->assertSame(self::MEMBER_NIK, LetterIdentityMask::valueAt(['kk_pendaftaran' => [['nik' => self::MEMBER_NIK]]], 'kk_pendaftaran.0.nik'));
    }
}
