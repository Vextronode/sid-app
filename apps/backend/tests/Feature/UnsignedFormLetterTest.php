<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Village;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Formulir pelayanan (format instansi luar) tidak bernomor surat desa dan
 * tidak ditandatangani/distempel Kepala Desa, tetapi tetap melalui
 * persetujuan RT dan Kepala Desa.
 */
class UnsignedFormLetterTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $rtApprover;

    private array $kades;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($this->village);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', ['name' => 'Pemohon Formulir']);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
    }

    public function test_form_letter_has_no_number_and_renders_without_the_village_head(): void
    {
        $letterId = $this->approve($this->letterType([
            'issues_letter_number' => false,
            'signed_by_village_head' => false,
        ]));

        $letter = Letter::query()->findOrFail($letterId);
        $this->assertNull($letter->letter_number);
        $this->assertNotNull($letter->snapshot);
        $this->assertNull($letter->snapshot['signer']['official_id']);
        $this->assertNull($letter->signed_by_official_id);

        // Tetap dapat diunduh walau Kepala Desa sudah tidak menjabat.
        $this->kades['official']->update(['is_active' => false]);

        $html = $this->download($letterId);
        $this->assertStringContainsString('FORMULIR Pemohon Formulir', $html);
        $this->assertStringNotContainsString('<img', $html);

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertOk()
            ->assertJsonPath('data.letter_number', null)
            ->assertJsonPath('data.letter_type.issues_letter_number', false)
            ->assertJsonPath('data.letter_type.signed_by_village_head', false);
        $this->actingAs($this->applicant['user'])
            ->getJson('/api/letters')
            ->assertOk()
            ->assertJsonPath('data.0.letter_type.signed_by_village_head', false);
    }

    public function test_village_letters_keep_their_number_and_village_head_signer(): void
    {
        $letterId = $this->approve($this->letterType());

        $letter = Letter::query()->findOrFail($letterId);
        $this->assertNotNull($letter->letter_number);
        $this->assertSame($this->kades['official']->id, $letter->snapshot['signer']['official_id']);
    }

    private function letterType(array $attributes = []): LetterType
    {
        return LetterType::factory()->create([
            'village_id' => $this->village->id,
            'flow_id' => $this->makeDefaultFlow()->id,
            'template' => '<p>FORMULIR {{ applicant_name }}</p><div>{{ signature_img }}</div>',
            'form_fields' => [],
            ...$attributes,
        ]);
    }

    private function approve(LetterType $letterType): string
    {
        $letterId = $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', ['letter_type_id' => $letterType->id])
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

    private function download(string $letterId): string
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
            ->get("/api/letters/{$letterId}/download")
            ->assertOk();

        return (string) $rendered;
    }
}
