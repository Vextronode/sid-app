<?php

namespace Tests\Feature;

use App\Enums\LetterFlowLogReason;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\User;
use App\Models\Village;
use App\Notifications\LetterStatusNotification;
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

class LetterFlowHardeningTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
    }

    public function test_form_values_are_escaped_and_cannot_override_system_placeholders(): void
    {
        $village = Village::factory()->create();
        $this->makeOfficialUser('kepala_desa', $village);
        $applicant = User::factory()->create(['village_id' => $village->id]);
        $letterType = LetterType::factory()->create([
            'flow_id' => $this->makeDefaultFlow()->id,
            'template' => 'Usaha: {{ jenis_usaha }} | Nomor: {{ letter_number }} | {{ signature_img }}',
        ]);
        $letter = Letter::factory()->approved()->create([
            'village_id' => $village->id,
            'letter_type_id' => $letterType->id,
            'submitted_by' => $applicant->id,
            'letter_number' => '470/001/Des/X/2026',
            'payload' => [
                'jenis_usaha' => '<script>alert(1)</script><b>Warung</b>',
                'letter_number' => 'PALSU',
                'signature_img' => '<img src="x">',
            ],
        ]);

        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('download')->once()->andReturn(new Response('', 200));
        Pdf::shouldReceive('loadView')
            ->once()
            ->with('pdf.templates.wet', Mockery::on(function (array $data): bool {
                return str_contains($data['template'], '&lt;script&gt;alert(1)&lt;/script&gt;&lt;b&gt;Warung&lt;/b&gt;')
                    && ! str_contains($data['template'], '<script>')
                    && str_contains($data['template'], 'Nomor: 470/001/Des/X/2026')
                    && ! str_contains($data['template'], 'PALSU')
                    && ! str_contains($data['template'], '<img src="x">');
            }))
            ->andReturn($pdf);

        $this->actingAs($applicant)
            ->get("/api/letters/{$letter->id}/download")
            ->assertOk();
    }

    public function test_letter_is_held_and_petugas_notified_when_rt_is_vacant(): void
    {
        $village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($village);
        $applicant = $this->makeCitizenAccount($village, $rt);
        $kades = $this->makeOfficialUser('kepala_desa', $village);
        $petugas = $this->makeOfficialUser('petugas_desa', $village);
        $letterType = LetterType::factory()->create(['flow_id' => $this->makeDefaultFlow()->id]);

        $letterId = $this->actingAs($applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $letterType->id,
                'purpose' => 'Keperluan administrasi',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->json('data.id');

        $letter = Letter::query()->findOrFail($letterId);
        $this->assertSame(1, $letter->current_step_order);
        $this->assertSame('rt', $letter->currentFlowStep()->approver_position);
        $this->assertDatabaseHas('letter_status_logs', [
            'letter_id' => $letterId,
            'reason' => LetterFlowLogReason::HeldForVacantApprover->value,
        ]);
        Notification::assertSentTo(
            $petugas['user'],
            LetterStatusNotification::class,
            fn (LetterStatusNotification $n): bool => $n->toArray($petugas['user'])['context']['status'] === 'approver_vacant',
        );
        Notification::assertNotSentTo($kades['user'], LetterStatusNotification::class);

        // Kades tidak dapat melompati step RT yang kosong.
        $this->actingAs($kades['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertStatus(409);
    }

    public function test_newly_assigned_rt_is_notified_about_waiting_letters_and_can_process_them(): void
    {
        $village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($village);
        $applicant = $this->makeCitizenAccount($village, $rt);
        $this->makeOfficialUser('kepala_desa', $village);
        $petugas = $this->makeOfficialUser('petugas_desa', $village);
        $candidate = $this->makeCitizenAccount($village, $rt);
        $letterType = LetterType::factory()->create(['flow_id' => $this->makeDefaultFlow()->id]);

        $letterId = $this->actingAs($applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $letterType->id,
                'purpose' => 'Keperluan administrasi',
            ])
            ->assertCreated()
            ->json('data.id');

        Storage::fake('public');
        $this->actingAs($petugas['user'])
            ->post('/api/officials/promote', [
                'user_id' => $candidate['user']->id,
                'position' => 'rt',
                'rt_id' => $rt->id,
                'started_at' => now()->toDateString(),
                'photo' => UploadedFile::fake()->image('foto.jpg'),
            ], ['Accept' => 'application/json'])
            ->assertSuccessful();

        Notification::assertSentTo(
            $candidate['user'],
            LetterStatusNotification::class,
            fn (LetterStatusNotification $n): bool => $n->toArray($candidate['user'])['context']['letter_id'] === $letterId,
        );

        $this->actingAs($candidate['user']->fresh())
            ->patchJson("/api/rt/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();

        $this->assertSame('in_progress', Letter::query()->findOrFail($letterId)->status->value);
    }

    public function test_single_step_flow_is_finalized_by_kades_alone(): void
    {
        $village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($village);
        $applicant = $this->makeCitizenAccount($village, $rt);
        $kades = $this->makeOfficialUser('kepala_desa', $village);
        $flow = $this->makeFlowWithSteps([['position' => 'kepala_desa', 'final' => true]]);
        $letterType = LetterType::factory()->create(['flow_id' => $flow->id]);

        $letterId = $this->actingAs($applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $letterType->id,
                'purpose' => 'Keperluan administrasi',
            ])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($kades['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();

        $letter = Letter::query()->findOrFail($letterId);
        $this->assertSame('approved', $letter->status->value);
        $this->assertNotEmpty($letter->letter_number);
    }
}
