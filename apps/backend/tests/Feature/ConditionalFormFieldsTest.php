<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Village;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Isian yang hanya tampil untuk pilihan tertentu (visible_when): wajibnya
 * hanya berlaku saat tampil, dan nilai isian tersembunyi tidak disimpan
 * maupun dicetak.
 */
class ConditionalFormFieldsTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private const JSON = ['Accept' => 'application/json'];

    private Village $village;

    private array $applicant;

    private array $rtApprover;

    private array $kades;

    private LetterType $letterType;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');

        $this->village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($this->village);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);

        $this->letterType = LetterType::factory()->create([
            'village_id' => $this->village->id,
            'flow_id' => $this->makeDefaultFlow()->id,
            'template' => '<p>WARGA {{ kewarganegaraan }}</p>{{#if kewarganegaraan=wna}}<p>PASPOR {{ nomor_paspor }}{{#if sponsor}} SPONSOR {{ sponsor }}{{/if}}</p>{{/if}}',
            'form_fields' => [
                [
                    'name' => 'kewarganegaraan',
                    'label' => 'Kewarganegaraan',
                    'type' => 'select',
                    'required' => true,
                    'options' => [['value' => 'wni', 'label' => 'WNI'], ['value' => 'wna', 'label' => 'Orang Asing']],
                ],
                ['name' => 'nomor_paspor', 'label' => 'Nomor Paspor', 'type' => 'text', 'required' => true, 'visible_when' => ['field' => 'kewarganegaraan', 'equals' => 'wna']],
                // Bergantung pada isian yang juga bersyarat.
                ['name' => 'sponsor', 'label' => 'Nama Sponsor', 'type' => 'text', 'required' => false, 'visible_when' => ['field' => 'nomor_paspor', 'filled' => true]],
                ['name' => 'kitas', 'label' => 'Foto KITAS', 'type' => 'file', 'required' => true, 'visible_when' => ['field' => 'kewarganegaraan', 'equals' => 'wna']],
            ],
        ]);
    }

    public function test_hidden_fields_are_not_required_and_their_values_are_dropped(): void
    {
        $letterId = $this->submit([
            'kewarganegaraan' => 'wni',
            // Sisa ketikan sebelum pilihan diganti ke WNI.
            'nomor_paspor' => 'A123',
            'sponsor' => 'PT Lama',
        ])->assertCreated()->json('data.id');

        $this->assertSame(['kewarganegaraan' => 'wni'], Letter::query()->findOrFail($letterId)->payload);

        $html = $this->render($letterId);
        $this->assertStringContainsString('WARGA WNI', $html);
        $this->assertStringNotContainsString('PASPOR', $html);
    }

    public function test_fields_shown_for_the_choice_are_required(): void
    {
        $this->submit(['kewarganegaraan' => 'wna'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.nomor_paspor', 'files.kitas']);

        $letterId = $this->submit(
            ['kewarganegaraan' => 'wna', 'nomor_paspor' => 'A123', 'sponsor' => 'PT Maju'],
            ['kitas' => UploadedFile::fake()->image('kitas.jpg')],
        )->assertCreated()->json('data.id');

        $html = $this->render($letterId);
        $this->assertStringContainsString('PASPOR A123 SPONSOR PT Maju', $html);
    }

    private function submit(array $payload, array $files = [])
    {
        return $this->actingAs($this->applicant['user'])->post('/api/letters', [
            'letter_type_id' => $this->letterType->id,
            'payload' => $payload,
            'files' => $files,
        ], self::JSON);
    }

    private function render(string $letterId): string
    {
        $this->actingAs($this->rtApprover['user'])
            ->patchJson("/api/rt/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();
        $this->actingAs($this->kades['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();

        $rendered = null;
        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('download')->once()->andReturn(new Response('', 200));
        Pdf::shouldReceive('loadView')
            ->once()
            ->with('pdf.templates.wet', Mockery::on(function (array $data) use (&$rendered): bool {
                $rendered = $data['template'];

                return true;
            }))
            ->andReturn($pdf);

        $this->actingAs($this->applicant['user'])->get("/api/letters/{$letterId}/download")->assertOk();

        return (string) $rendered;
    }
}
