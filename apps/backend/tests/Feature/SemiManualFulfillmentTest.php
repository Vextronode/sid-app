<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Aksi data semi-manual: menonaktifkan anggota KK yang dipilih pemohon,
 * dan "Tandai selesai" untuk perubahan yang dikerjakan Kasi/Kaur sendiri.
 */
class SemiManualFulfillmentTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $rtApprover;

    private array $kades;

    private array $kasi;

    private Family $family;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($this->village);
        $this->family = Family::factory()->create(['village_id' => $this->village->id]);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'family_id' => $this->family->id,
            'family_role' => 'kepala_keluarga',
        ]);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
        $this->kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village);
    }

    public function test_selected_family_members_are_deactivated_with_their_accounts(): void
    {
        $child = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'family_id' => $this->family->id,
            'family_role' => 'anak',
            'name' => 'Anak Pindah',
        ]);
        $childAccount = User::factory()->create(['role' => 'warga', 'village_id' => $this->village->id, 'citizen_id' => $child->id]);
        $wife = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'family_id' => $this->family->id,
            'family_role' => 'istri',
        ]);

        $letterId = $this->approve($this->letterType([
            'data_action' => 'deactivate_members',
            'data_subject_field' => 'anggota_pindah',
            'form_fields' => [['name' => 'anggota_pindah', 'label' => 'Anggota yang Pindah', 'type' => 'family_members', 'required' => true]],
            'template' => '<p>{{#each anggota_pindah}}{{ nama }}{{/each}}</p>',
        ]), ['anggota_pindah' => [$child->id, $wife->id]]);

        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letterId}/fulfillment")
            ->assertOk()
            ->assertJsonPath('data.action', 'deactivate_members')
            ->assertJsonCount(2, 'data.members')
            ->assertJsonPath('data.members.0.name', 'Anak Pindah')
            ->assertJsonPath('data.members.0.found', true)
            ->assertJsonPath('data.members.0.is_active', true)
            ->assertJsonPath('data.subject', null);

        $this->actingAs($this->kasi['user'])->postJson("/api/letters/{$letterId}/fulfillment")->assertOk();

        $this->assertFalse($child->fresh()->is_active);
        $this->assertFalse($childAccount->fresh()->is_active);
        $this->assertFalse($wife->fresh()->is_active);
        // Pemohon sendiri tidak dipilih, jadi tetap aktif.
        $this->assertTrue($this->applicant['citizen']->fresh()->is_active);

        $letter = Letter::query()->findOrFail($letterId);
        $this->assertCount(2, $letter->fulfillment['members']);
        $this->assertSame(2, DB::table('activity_log')->where('event', 'letter_fulfilled')->count());

        $this->actingAs($this->kasi['user'])->postJson("/api/letters/{$letterId}/fulfillment")->assertStatus(409);
    }

    public function test_manual_changes_are_marked_done_with_notes_without_touching_data(): void
    {
        $letterId = $this->approve($this->letterType([
            'data_action' => 'manual',
            'data_instructions' => 'Perbarui susunan KK sesuai KK baru dari Disdukcapil.',
        ]));

        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letterId}/fulfillment")
            ->assertOk()
            ->assertJsonPath('data.action', 'manual')
            ->assertJsonPath('data.instructions', 'Perbarui susunan KK sesuai KK baru dari Disdukcapil.')
            ->assertJsonPath('data.fields', []);
        $this->detail($letterId)->assertJsonPath('data.needs_fulfillment', true);

        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['notes' => 'KK baru sudah diinput.'])
            ->assertOk();

        $letter = Letter::query()->findOrFail($letterId);
        $this->assertNotNull($letter->fulfilled_at);
        $this->assertSame(['action' => 'manual', 'notes' => 'KK baru sudah diinput.'], $letter->fulfillment);
        $this->assertTrue($letter->statusLogs()->where('reason', 'like', '%ditandai selesai%')->exists());
        $this->assertSame(0, DB::table('activity_log')->where('event', 'letter_fulfilled')->count());
        $this->detail($letterId)->assertJsonPath('data.needs_fulfillment', false);
    }

    private function letterType(array $attributes): LetterType
    {
        return LetterType::factory()->create([
            'village_id' => $this->village->id,
            'flow_id' => $this->makeDefaultFlow()->id,
            'assigned_role' => 'kasi_pemerintahan',
            'template' => '<p>FORMULIR</p>',
            'form_fields' => [],
            ...$attributes,
        ]);
    }

    private function approve(LetterType $letterType, array $payload = []): string
    {
        $letterId = $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $letterType->id,
                ...($payload === [] ? [] : ['payload' => $payload]),
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

    private function detail(string $letterId)
    {
        return $this->actingAs($this->kasi['user'])->getJson("/api/letters/{$letterId}")->assertOk();
    }
}
