<?php

namespace Tests\Feature;

use App\Models\ApprovalFlow;
use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class KadesApprovalControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
    }

    private function makeLetterAtKadesStep(Village $village): Letter
    {
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 1,
            'approver_position' => 'kepala_desa',
            'is_final' => false,
        ]);
        FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 2,
            'approver_position' => 'kasi_pelayanan',
            'is_final' => true,
        ]);

        return Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);
    }

    private function makeUserWithPosition(string $position, Village $village): User
    {
        $official = Official::factory()->create([
            'position' => $position,
            'village_id' => $village->id,
            'is_active' => true,
        ]);
        $user = User::factory()->create(['role' => $position === 'sekdes' ? 'sekretaris_desa' : 'kepala_desa']);
        $user->official()->save($official);

        return $user->fresh();
    }

    public function test_index_returns_letters_at_kades_step(): void
    {
        $village = Village::factory()->create();
        $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $this->actingAs($kades)
            ->getJson('/api/kades/letters')
            ->assertOk()
            ->assertJsonPath('message', 'Daftar surat Kepala Desa berhasil diambil.')
            ->assertJsonCount(1, 'data');
    }

    public function test_index_also_accessible_by_sekdes(): void
    {
        $village = Village::factory()->create();
        $this->makeLetterAtKadesStep($village);
        $sekdes = $this->makeUserWithPosition('sekdes', $village);

        $this->actingAs($sekdes)
            ->getJson('/api/kades/letters')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_index_requires_authentication(): void
    {
        $this->getJson('/api/kades/letters')->assertUnauthorized();
    }

    public function test_index_forbidden_for_non_kades_role(): void
    {
        $village = Village::factory()->create();
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->actingAs($kasi)
            ->getJson('/api/kades/letters')
            ->assertStatus(403);
    }

    public function test_show_returns_letter_detail(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $this->actingAs($kades)
            ->getJson("/api/kades/letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $letter->id);
    }

    public function test_decision_approve_by_kades_advances_letter(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $this->actingAs($kades)
            ->patchJson("/api/kades/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('message', 'Surat berhasil diproses.');

        $this->assertSame(2, $letter->fresh()->current_step_order);
    }

    public function test_decision_approve_by_sekdes_also_works(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $sekdes = $this->makeUserWithPosition('sekdes', $village);

        $this->actingAs($sekdes)
            ->patchJson("/api/kades/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertOk();

        $this->assertSame(2, $letter->fresh()->current_step_order);
    }

    /**
     * Bukti end-to-end aturan "siapa cepat dia dapat": setelah Kades
     * approve lewat HTTP, percobaan Sekdes approve surat yang sama
     * lewat HTTP juga harus ditolak.
     */
    public function test_second_http_decision_by_the_other_official_is_rejected(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);
        $sekdes = $this->makeUserWithPosition('sekdes', $village);

        $this->actingAs($kades)
            ->patchJson("/api/kades/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertOk();

        $this->actingAs($sekdes)
            ->patchJson("/api/kades/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertStatus(409);
    }

    public function test_decision_reject_requires_notes(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $this->actingAs($kades)
            ->patchJson("/api/kades/letters/{$letter->id}/decision", ['status' => 'rejected'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['notes']);
    }

    public function test_decision_reject_with_notes_succeeds(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $this->actingAs($kades)
            ->patchJson("/api/kades/letters/{$letter->id}/decision", [
                'status' => 'rejected',
                'notes' => 'Berkas tidak sesuai',
            ])
            ->assertOk();

        $fresh = $letter->fresh();
        $this->assertSame(1, $fresh->rejected_at_step);
    }

    public function test_decision_forbidden_for_non_kades_role(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->actingAs($kasi)
            ->patchJson("/api/kades/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertStatus(403);
    }

    public function test_decision_requires_authentication(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);

        $this->patchJson("/api/kades/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertUnauthorized();
    }
}
