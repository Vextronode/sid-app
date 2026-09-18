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

class KasiApprovalControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
    }

    private function makeLetterAtKasiStep(Village $village): Letter
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
            'current_step_order' => 2,
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
        $user = User::factory()->create(['role' => $position]);
        $user->official()->save($official);

        return $user->fresh();
    }

    public function test_index_returns_letters_at_final_kasi_step(): void
    {
        $village = Village::factory()->create();
        $this->makeLetterAtKasiStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->actingAs($kasi)
            ->getJson('/api/kasi/letters')
            ->assertOk()
            ->assertJsonPath('message', 'Daftar surat Kasi/Kaur berhasil diambil.')
            ->assertJsonCount(1, 'data');
    }

    public function test_index_requires_authentication(): void
    {
        $this->getJson('/api/kasi/letters')->assertUnauthorized();
    }

    public function test_index_forbidden_for_non_kasi_role(): void
    {
        $village = Village::factory()->create();
        $rt = $this->makeUserWithPosition('rt', $village);

        $this->actingAs($rt)
            ->getJson('/api/kasi/letters')
            ->assertStatus(403);
    }

    public function test_show_returns_letter_detail(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->actingAs($kasi)
            ->getJson("/api/kasi/letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $letter->id);
    }

    public function test_decision_approve_sets_generic_approved_status_and_letter_number(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->actingAs($kasi)
            ->patchJson("/api/kasi/letters/{$letter->id}", ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('message', 'Surat berhasil diproses.');

        $fresh = $letter->fresh();
        $this->assertSame('approved', $fresh->status->value);
        $this->assertNotNull($fresh->letter_number);
        $this->assertNotNull($fresh->expires_at);
    }

    public function test_decision_reject_requires_notes(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->actingAs($kasi)
            ->patchJson("/api/kasi/letters/{$letter->id}", ['status' => 'rejected'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['notes']);
    }

    public function test_decision_reject_with_notes_succeeds(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->actingAs($kasi)
            ->patchJson("/api/kasi/letters/{$letter->id}", [
                'status' => 'rejected',
                'notes' => 'Berkas tidak sesuai',
            ])
            ->assertOk();

        $fresh = $letter->fresh();
        $this->assertSame('rejected', $fresh->status->value);
        $this->assertSame(2, $fresh->rejected_at_step);
        $this->assertNull($fresh->letter_number);
    }

    public function test_second_http_decision_on_the_same_letter_is_rejected(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->actingAs($kasi)
            ->patchJson("/api/kasi/letters/{$letter->id}", ['status' => 'approved'])
            ->assertOk();

        $this->actingAs($kasi)
            ->patchJson("/api/kasi/letters/{$letter->id}", ['status' => 'approved'])
            ->assertStatus(409);
    }

    public function test_decision_forbidden_for_non_kasi_role(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $rt = $this->makeUserWithPosition('rt', $village);

        $this->actingAs($rt)
            ->patchJson("/api/kasi/letters/{$letter->id}", ['status' => 'approved'])
            ->assertStatus(403);
    }

    public function test_decision_requires_authentication(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);

        $this->patchJson("/api/kasi/letters/{$letter->id}", ['status' => 'approved'])
            ->assertUnauthorized();
    }
}
