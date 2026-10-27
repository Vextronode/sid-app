<?php

namespace Tests\Feature;

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
 * Satu pengajuan dapat menerbitkan beberapa dokumen: dokumen utama dan
 * dokumen yang terbit bersama bila syarat jawabannya terpenuhi.
 */
class LetterDocumentsTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $rtApprover;

    private array $kades;

    private LetterType $letterType;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($this->village);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', ['name' => 'Pemohon Pindah']);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);

        $this->letterType = LetterType::factory()->create([
            'village_id' => $this->village->id,
            'flow_id' => $this->makeDefaultFlow()->id,
            'name' => 'Formulir Pindah',
            'template' => '<p>PINDAH {{ applicant_name }}</p>',
            'form_fields' => [[
                'name' => 'kk_berubah',
                'label' => 'KK ikut berubah?',
                'type' => 'select',
                'required' => true,
                'options' => [['value' => 'ya', 'label' => 'Ya'], ['value' => 'tidak', 'label' => 'Tidak']],
            ]],
            'documents' => [
                ['key' => 'pendaftaran', 'title' => 'Formulir Pendaftaran', 'template' => '<p>PENDAFTARAN {{ applicant_name }}</p>', 'when' => ['field' => 'kk_berubah', 'equals' => 'ya']],
                ['key' => 'pernyataan', 'title' => 'Surat Pernyataan', 'template' => '<p>PERNYATAAN {{ applicant_name }}</p>'],
            ],
        ]);
    }

    public function test_documents_issued_together_follow_the_answers_in_the_form(): void
    {
        $withKk = $this->approve('ya');
        $withoutKk = $this->approve('tidak');

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$withKk}")
            ->assertOk()
            ->assertJsonPath('data.documents', [
                ['key' => 'main', 'title' => 'Formulir Pindah'],
                ['key' => 'pendaftaran', 'title' => 'Formulir Pendaftaran'],
                ['key' => 'pernyataan', 'title' => 'Surat Pernyataan'],
            ]);
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$withoutKk}")
            ->assertJsonPath('data.documents.1.key', 'pernyataan')
            ->assertJsonCount(2, 'data.documents');

        $this->assertStringContainsString('PINDAH Pemohon Pindah', $this->render($withKk, null));
        $this->assertStringContainsString('PENDAFTARAN Pemohon Pindah', $this->render($withKk, 'pendaftaran', 'surat-'.$withKk.'-pendaftaran.pdf'));

        // Dokumen yang syaratnya tidak terpenuhi, atau tidak dikenal, tidak dapat diunduh.
        $this->actingAs($this->applicant['user'])
            ->get("/api/letters/{$withoutKk}/download?document=pendaftaran")
            ->assertNotFound();
        $this->actingAs($this->applicant['user'])
            ->get("/api/letters/{$withKk}/download?document=tidak-ada")
            ->assertNotFound();
    }

    public function test_issued_documents_are_frozen_at_final_approval(): void
    {
        $letterId = $this->approve('ya');

        $this->letterType->update(['documents' => [
            ['key' => 'pendaftaran', 'title' => 'Formulir Baru', 'template' => '<p>VERSI BARU</p>'],
        ]]);

        $this->assertStringContainsString('PENDAFTARAN Pemohon Pindah', $this->render($letterId, 'pendaftaran', 'surat-'.$letterId.'-pendaftaran.pdf'));
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.1.title', 'Formulir Pendaftaran')
            ->assertJsonCount(3, 'data.documents');
    }

    private function approve(string $kkChanged): string
    {
        $letterId = $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $this->letterType->id,
                'payload' => ['kk_berubah' => $kkChanged],
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

    private function render(string $letterId, ?string $document, ?string $filename = null): string
    {
        $rendered = null;
        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('download')->once()->with($filename ?? "surat-{$letterId}.pdf")->andReturn(new Response('', 200));
        Pdf::shouldReceive('loadView')
            ->once()
            ->with('pdf.templates.wet', Mockery::on(function (array $data) use (&$rendered): bool {
                $rendered = $data['template'];

                return true;
            }))
            ->andReturn($pdf);

        $query = $document === null ? '' : "?document={$document}";
        $this->actingAs($this->applicant['user'])
            ->get("/api/letters/{$letterId}/download{$query}")
            ->assertOk();

        return (string) $rendered;
    }
}
