<?php

namespace Tests\Feature;

use App\Models\LetterSignature;
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
 * Permintaan saksi (isian NIK ber-`witness`): blokir pemohon, masa berlaku
 * permintaan, dan dokumen pendukung. Tidak ada tanda tangan digital; surat
 * ditandatangani basah di kantor desa.
 */
class WitnessRequestTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private const WITNESS_NIK = '3207010101900001';

    private Village $village;

    private array $applicant;

    private array $witness;

    private array $rtApprover;

    private LetterType $letterType;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($this->village);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt);
        $this->witness = $this->makeCitizenAccount($this->village, $rt, 'warga', ['nik' => self::WITNESS_NIK]);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->makeOfficialUser('kepala_desa', $this->village);
        $this->letterType = LetterType::factory()->create([
            'flow_id' => $this->makeDefaultFlow()->id,
            'template' => 'Surat {{ applicant_name }}',
            'supporting_template' => 'Pernyataan {{ applicant_name }} | Saksi {{ nama_saksi }} {{ tanda_tangan_pemohon }}',
            'form_fields' => [
                ['name' => 'nik_saksi', 'label' => 'NIK Saksi', 'type' => 'nik', 'required' => true, 'witness' => 'Saksi'],
                ['name' => 'nama_saksi', 'label' => 'Nama Saksi', 'type' => 'text', 'required' => false, 'from_nik' => 'nik_saksi'],
            ],
        ]);
    }

    public function test_recipient_can_block_a_requester_and_later_unblock(): void
    {
        $this->submit()->assertCreated();
        $requestId = LetterSignature::query()->where('status', 'pending')->value('id');

        $this->actingAs($this->witness['user'])
            ->postJson("/api/signature-requests/{$requestId}/reject", ['block' => true])
            ->assertOk();

        $this->submit()
            ->assertStatus(422)
            ->assertJsonValidationErrors(['payload.nik_saksi']);

        $blockId = $this->actingAs($this->witness['user'])
            ->getJson('/api/signature-blocks')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->json('data.0.id');
        $this->actingAs($this->applicant['user'])
            ->deleteJson("/api/signature-blocks/{$blockId}")
            ->assertNotFound();
        $this->actingAs($this->witness['user'])
            ->deleteJson("/api/signature-blocks/{$blockId}")
            ->assertOk();

        $this->submit()->assertCreated();
    }

    public function test_expired_request_cannot_be_accepted_and_the_witness_can_be_asked_again(): void
    {
        $letterId = $this->submit()->json('data.id');
        $requestId = LetterSignature::query()->where('status', 'pending')->value('id');

        $this->travel(config('letters.signature.request_ttl_days') + 1)->days();

        $this->actingAs($this->witness['user'])
            ->getJson('/api/signature-requests')
            ->assertJsonCount(0, 'data');
        $this->actingAs($this->witness['user'])
            ->postJson("/api/signature-requests/{$requestId}/accept", ['password' => 'Password123'])
            ->assertStatus(409);
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.signatures.0.status', 'expired');

        // Pemohon dapat mengajukan ulang ke NIK yang sama.
        $this->actingAs($this->applicant['user'])
            ->postJson("/api/letters/{$letterId}/signatures/nik_saksi", ['nik' => self::WITNESS_NIK])
            ->assertOk()
            ->assertJsonPath('data.status', 'pending');
    }

    public function test_supporting_document_prints_names_without_signatures_and_is_limited_to_viewers_of_the_letter(): void
    {
        $letterId = $this->submit()->json('data.id');
        $requestId = LetterSignature::query()->where('status', 'pending')->value('id');
        $this->actingAs($this->witness['user'])
            ->postJson("/api/signature-requests/{$requestId}/accept", ['password' => 'Password123'])
            ->assertOk();
        $outsider = $this->makeCitizenAccount($this->village, null);

        $rendered = null;
        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('stream')->once()->andReturn(new Response('', 200));
        $pdf->shouldReceive('download')->once()->andReturn(new Response('', 200));
        Pdf::shouldReceive('loadView')
            ->twice()
            ->with('pdf.templates.letter', Mockery::on(function (array $data) use (&$rendered): bool {
                $rendered = $data['template'];

                return true;
            }))
            ->andReturn($pdf);

        $this->actingAs($this->rtApprover['user'])
            ->get("/api/letters/{$letterId}/supporting-document")
            ->assertOk();
        $this->actingAs($this->applicant['user'])
            ->get("/api/letters/{$letterId}/supporting-document?download=1")
            ->assertOk();

        $this->assertStringContainsString('Pernyataan '.e($this->applicant['citizen']->name), $rendered);
        $this->assertStringContainsString(e($this->witness['citizen']->name), $rendered);
        // Nama tercetak; TTD dibubuhkan basah.
        $this->assertStringNotContainsString('<img', $rendered);

        $this->actingAs($outsider['user'])
            ->getJson("/api/letters/{$letterId}/supporting-document")
            ->assertForbidden();
    }

    public function test_supporting_document_is_404_for_letter_types_without_one(): void
    {
        $plainType = LetterType::factory()->create(['flow_id' => $this->makeDefaultFlow()->id]);
        $letterId = $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', ['letter_type_id' => $plainType->id, 'purpose' => 'Keperluan'])
            ->assertCreated()
            ->assertJsonPath('data.awaiting_signatures', false)
            ->json('data.id');

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}/supporting-document")
            ->assertNotFound();
    }

    private function submit()
    {
        return $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $this->letterType->id,
                'payload' => ['nik_saksi' => self::WITNESS_NIK],
            ]);
    }
}
