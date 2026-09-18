<?php

namespace Tests\Feature;

use App\Models\ApprovalFlow;
use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RtApprovalControllerTest extends TestCase
{
    use RefreshDatabase;

    private function makeLetterAtRtStep(Village $village): array
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['village_id' => $village->id, 'rt_id' => $rt->id]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 1,
            'approver_position' => 'rt',
            'is_final' => false,
        ]);
        FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 2,
            'approver_position' => 'kepala_desa',
            'is_final' => true,
        ]);

        $letter = Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
            'status' => 'pending',
        ]);

        return compact('letter', 'rt', 'rw', 'citizen');
    }

    private function makeRtUser(Village $village, Rt $rt): User
    {
        $official = Official::factory()->create([
            'position' => 'rt',
            'village_id' => $village->id,
            'rt_id' => $rt->id,
            'is_active' => true,
        ]);
        $user = User::factory()->create(['role' => 'rt']);
        $user->official()->save($official);

        return $user->fresh();
    }

    public function test_index_returns_pending_letters_for_rt(): void
    {
        $village = Village::factory()->create();
        ['rt' => $rt] = $this->makeLetterAtRtStep($village);
        $user = $this->makeRtUser($village, $rt);

        $this->actingAs($user)
            ->getJson('/api/rt/letters')
            ->assertOk()
            ->assertJsonPath('message', 'Daftar surat RT berhasil diambil.')
            ->assertJsonCount(1, 'data');
    }

    public function test_decision_approve_marks_letter_in_progress_and_advances_step(): void
    {
        Notification::fake();

        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $user = $this->makeRtUser($village, $rt);

        $this->actingAs($user)
            ->patchJson("/api/rt/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('message', 'Surat berhasil diproses.');

        $this->assertDatabaseHas('letters', [
            'id' => $letter->id,
            'status' => 'in_progress',
            'current_step_order' => 2,
        ]);
        $this->assertDatabaseHas('letter_approvals', [
            'letter_id' => $letter->id,
            'approval_level' => 'rt',
            'action' => 'approved',
        ]);
    }

    public function test_decision_reject_marks_letter_rejected_with_step_recorded(): void
    {
        Notification::fake();

        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $user = $this->makeRtUser($village, $rt);

        $this->actingAs($user)
            ->patchJson("/api/rt/letters/{$letter->id}/decision", [
                'status' => 'rejected',
                'notes' => 'Dokumen tidak sesuai',
            ])
            ->assertOk();

        $this->assertDatabaseHas('letters', [
            'id' => $letter->id,
            'status' => 'rejected',
            'rejected_at_step' => 1,
        ]);
    }

    public function test_decision_reject_requires_notes(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $user = $this->makeRtUser($village, $rt);

        $this->actingAs($user)
            ->patchJson("/api/rt/letters/{$letter->id}/decision", ['status' => 'rejected'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('notes');
    }

    public function test_decision_forbidden_when_rt_mismatch(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter] = $this->makeLetterAtRtStep($village);

        $otherRt = Rt::factory()->create();
        $user = $this->makeRtUser($village, $otherRt);

        $this->actingAs($user)
            ->patchJson("/api/rt/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertForbidden();
    }

    public function test_show_returns_letter_detail_with_relations(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $user = $this->makeRtUser($village, $rt);

        $this->actingAs($user)
            ->getJson("/api/rt/letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $letter->id);
    }
}
