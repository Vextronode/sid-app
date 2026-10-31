<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterType;
use App\Models\User;
use App\Models\Village;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

class LetterSnapshotTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private const TEMPLATE = '{{ applicant_name }}|{{ applicant_gender }}|{{ applicant_birth_place_date }}|{{ village_name }}|{{ village_head_name }}';

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
    }

    public function test_final_approval_freezes_render_data_and_signer(): void
    {
        ['letter' => $letter, 'kades' => $kades] = $this->approvedLetter();

        $this->assertSame($kades['official']->id, $letter->signed_by_official_id);
        $this->assertSame(self::TEMPLATE, $letter->snapshot['template']);
        $this->assertSame($kades['citizen']->name, $letter->snapshot['signer']['name']);
        $this->assertSame('Laki-laki', $letter->snapshot['applicant']['gender']);
    }

    public function test_redownload_is_unchanged_after_kades_citizen_village_and_template_change(): void
    {
        ['letter' => $letter, 'kades' => $kades, 'applicant' => $applicant, 'village' => $village] = $this->approvedLetter();

        $before = $this->renderedTemplate($letter, $applicant['user']);

        // Ganti Kades, ubah data warga, nama desa, dan template tipe surat.
        $kades['official']->update(['is_active' => false, 'ended_at' => now()->toDateString()]);
        $newKades = $this->makeOfficialUser('kepala_desa', $village);
        $applicant['citizen']->update(['gender' => 'P', 'place_of_birth' => 'Tempat Lain']);
        $village->update(['name' => 'Desa Nama Baru']);
        $letter->letterType->update(['template' => 'TEMPLATE BARU {{ applicant_name }}']);

        $after = $this->renderedTemplate($letter->fresh(), $applicant['user']);

        $this->assertSame($before, $after);
        $this->assertStringContainsString($kades['citizen']->name, $after);
        $this->assertStringNotContainsString($newKades['citizen']->name, $after);
        $this->assertStringNotContainsString('TEMPLATE BARU', $after);
    }

    public function test_letter_approved_before_snapshots_existed_is_frozen_on_first_download(): void
    {
        $village = Village::factory()->create();
        $kades = $this->makeOfficialUser('kepala_desa', $village);
        $applicant = User::factory()->create(['village_id' => $village->id]);
        $letterType = LetterType::factory()->create([
            'flow_id' => $this->makeDefaultFlow()->id,
            'template' => self::TEMPLATE,
        ]);
        $letter = Letter::factory()->approved()->create([
            'village_id' => $village->id,
            'letter_type_id' => $letterType->id,
            'submitted_by' => $applicant->id,
        ]);
        $this->assertNull($letter->snapshot);

        $this->renderedTemplate($letter, $applicant);

        $letter->refresh();
        $this->assertNotNull($letter->snapshot);
        $this->assertSame($kades['official']->id, $letter->signed_by_official_id);
    }

    public function test_preview_before_approval_is_for_approvers_only_and_stores_no_snapshot(): void
    {
        $village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($village);
        $this->makeOfficialUser('kepala_desa', $village);
        $rtApprover = $this->makeOfficialUser('rt', $village, ['rt_id' => $rt->id]);
        $applicant = $this->makeCitizenAccount($village, $rt);
        $letterType = LetterType::factory()->create([
            'flow_id' => $this->makeDefaultFlow()->id,
            'template' => self::TEMPLATE,
        ]);
        $letterId = $this->actingAs($applicant['user'])
            ->postJson('/api/letters', ['letter_type_id' => $letterType->id, 'purpose' => 'Keperluan'])
            ->assertCreated()
            ->json('data.id');

        // Pemohon baru dapat melihat suratnya setelah terbit.
        $this->actingAs($applicant['user'])
            ->get("/api/letters/{$letterId}/preview")
            ->assertForbidden();

        // RT yang memutus melihat surat dari data hidup.
        $this->actingAs($rtApprover['user'])
            ->get("/api/letters/{$letterId}/preview")
            ->assertOk();

        $this->assertNull(Letter::query()->findOrFail($letterId)->snapshot);
    }

    /**
     * @return array{letter: Letter, kades: array, applicant: array, village: Village}
     */
    private function approvedLetter(): array
    {
        $village = Village::factory()->create(['name' => 'Desa Awal']);
        ['rt' => $rt] = $this->makeArea($village);
        $applicant = $this->makeCitizenAccount($village, $rt, 'warga', [
            'gender' => 'L',
            'place_of_birth' => 'Tempat Awal',
        ]);
        $rtApprover = $this->makeOfficialUser('rt', $village, ['rt_id' => $rt->id]);
        $kades = $this->makeOfficialUser('kepala_desa', $village);
        $letterType = LetterType::factory()->create([
            'flow_id' => $this->makeDefaultFlow()->id,
            'template' => self::TEMPLATE,
        ]);

        $letterId = $this->actingAs($applicant['user'])
            ->postJson('/api/letters', ['letter_type_id' => $letterType->id, 'purpose' => 'Keperluan'])
            ->assertCreated()
            ->json('data.id');
        $this->actingAs($rtApprover['user'])
            ->patchJson("/api/rt/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();
        $this->actingAs($kades['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();

        return [
            'letter' => Letter::query()->findOrFail($letterId),
            'kades' => $kades,
            'applicant' => $applicant,
            'village' => $village,
        ];
    }

    private function renderedTemplate(Letter $letter, User $user): string
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

        $this->actingAs($user)
            ->get("/api/letters/{$letter->id}/download")
            ->assertOk();

        return $rendered;
    }
}
