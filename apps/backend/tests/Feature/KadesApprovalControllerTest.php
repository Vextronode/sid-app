<?php

namespace Tests\Feature;

use App\Models\ApprovalFlow;
use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\LetterApproval;
use App\Models\LetterType;
use App\Models\Official;
use App\Models\User;
use App\Models\Village;
use App\Notifications\LetterStatusNotification;
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

        $flow = ApprovalFlow::factory()->create(['village_id' => $village->id]);
        FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 1,
            'approver_position' => 'kepala_desa',
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
        ]);
        Official::factory()->create([
            'position' => 'sekdes',
            'village_id' => $village->id,
            'is_active' => true,
        ]);

        return $letter;
    }

    private function makeUserWithPosition(string $position, Village $village): User
    {
        $official = Official::factory()->create([
            'position' => $position,
            'village_id' => $village->id,
            'is_active' => true,
        ]);
        $user = User::factory()->create([
            'role' => $position === 'sekdes' ? 'sekretaris_desa' : 'kepala_desa',
            'village_id' => $village->id,
        ]);
        $user->official()->save($official);

        return $user->fresh();
    }

    public function test_index_returns_letters_at_kades_step(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $this->markRtApproved($letter);
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
        $letter = $this->makeLetterAtKadesStep($village);
        $this->markRtApproved($letter);
        $sekdes = $this->makeUserWithPosition('sekdes', $village);

        $this->actingAs($sekdes)
            ->getJson('/api/kades/letters')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_index_includes_letters_at_second_kepala_desa_step(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $this->markRtApproved($letter);
        $letter->update(['current_step_order' => 2]);
        $sekdes = $this->makeUserWithPosition('sekdes', $village);

        $this->actingAs($sekdes)
            ->getJson('/api/kades/letters')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $letter->id);
    }

    public function test_index_excludes_letters_submitted_by_current_kades(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);
        $letter->update(['submitted_by' => $kades->id]);

        $this->actingAs($kades)
            ->getJson('/api/kades/letters')
            ->assertOk()
            ->assertJsonCount(0, 'data');
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
        $this->markRtApproved($letter);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $this->actingAs($kades)
            ->getJson("/api/kades/letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $letter->id);
    }

    private function markRtApproved(Letter $letter): void
    {
        $approver = User::factory()->create(['village_id' => $letter->village_id]);
        LetterApproval::query()->create([
            'letter_id' => $letter->id,
            'approved_by' => $approver->id,
            'approval_level' => 'rt',
            'action' => 'approved',
        ]);
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

    public function test_decision_accepts_kepala_desa_final_step_with_kades_actor(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $letter->update(['current_step_order' => 2]);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $this->actingAs($kades)
            ->patchJson("/api/kades/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertOk();

        $this->assertSame('approved', $letter->fresh()->status->value);
        $this->assertDatabaseHas('letter_approvals', [
            'letter_id' => $letter->id,
            'approved_by' => $kades->id,
            'approval_level' => 'kepala_desa',
            'action' => 'approved',
        ]);
    }

    /**
     * Bukti end-to-end aturan "siapa cepat dia dapat": setelah Kades
     * approve lewat HTTP, percobaan Sekdes approve surat yang sama
     * lewat HTTP juga harus ditolak.
     */
    public function test_second_http_decision_by_the_other_official_is_rejected(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeFinalLetter($village, LetterType::factory()->create());
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

    public function test_rejected_letter_is_hidden_and_cannot_be_decided_again(): void
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

        $this->actingAs($kades)
            ->getJson('/api/kades/letters')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($kades)
            ->patchJson("/api/kades/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertStatus(409)
            ->assertJsonPath('message', 'Surat sudah diproses sebelumnya.');

        $this->assertDatabaseHas('letters', ['id' => $letter->id, 'status' => 'rejected']);
        $this->assertDatabaseCount('letter_approvals', 1);
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

    public function test_kades_cannot_decide_own_letter(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);
        $letter->update(['submitted_by' => $kades->id]);

        $this->actingAs($kades)
            ->patchJson("/api/kades/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Anda tidak dapat memutuskan surat milik Anda sendiri.');
    }

    public function test_final_approval_generates_unique_number_and_keeps_final_step_order(): void
    {
        $village = Village::factory()->create();
        $letterType = LetterType::factory()->create(['code' => 'SKTM', 'validity_days' => 30]);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);
        $first = $this->makeFinalLetter($village, $letterType);
        $second = $this->makeFinalLetter($village, $letterType);

        $this->actingAs($kades)
            ->patchJson("/api/kades/letters/{$first->id}/decision", ['status' => 'approved'])
            ->assertOk();
        $this->actingAs($kades)
            ->patchJson("/api/kades/letters/{$second->id}/decision", ['status' => 'approved'])
            ->assertOk();

        $first = $first->fresh();
        $second = $second->fresh();
        $this->assertSame(1, $first->current_step_order);
        $this->assertSame(1, $second->current_step_order);
        $this->assertMatchesRegularExpression('/^\d{3}\/SKTM\/\d{4}$/', $first->letter_number);
        $this->assertNotSame($first->letter_number, $second->letter_number);
        $this->assertNotNull($first->expires_at);
        $this->assertTrue($first->expires_at->isSameDay(now()->addDays(30)));
    }

    public function test_final_approval_notifies_applicant_and_assigned_kasi(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeFinalLetter($village, LetterType::factory()->create([
            'assigned_role' => 'kasi_pelayanan',
        ]));
        $citizen = $letter->citizen;
        $applicant = User::factory()->create(['citizen_id' => $citizen->id]);
        $letter->update(['submitted_by' => $applicant->id]);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);
        $kaur = $this->makeUserWithPosition('kaur_tu_umum', $village);

        $this->actingAs($kades)
            ->patchJson("/api/kades/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertOk();

        Notification::assertSentTo(
            $applicant,
            LetterStatusNotification::class,
            fn ($notification) => $notification->toArray($applicant)['context']['status'] === 'letter_approved_final',
        );
        Notification::assertSentTo(
            $kasi,
            LetterStatusNotification::class,
            fn ($notification) => $notification->toArray($kasi)['context']['status'] === 'letter_ready_for_print',
        );
        Notification::assertNotSentTo($kaur, LetterStatusNotification::class);
    }

    public function test_final_approval_notifies_both_kasi_and_kaur_when_unassigned(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeFinalLetter($village, LetterType::factory()->create(['assigned_role' => null]));
        $kades = $this->makeUserWithPosition('kepala_desa', $village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);
        $kaur = $this->makeUserWithPosition('kaur_tu_umum', $village);

        $this->actingAs($kades)
            ->patchJson("/api/kades/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertOk();

        Notification::assertSentTo(
            $kasi,
            LetterStatusNotification::class,
            fn ($notification) => $notification->toArray($kasi)['context']['status'] === 'letter_ready_for_print',
        );
        Notification::assertSentTo(
            $kaur,
            LetterStatusNotification::class,
            fn ($notification) => $notification->toArray($kaur)['context']['status'] === 'letter_ready_for_print',
        );
    }

    public function test_kades_applicant_can_be_approved_by_sekdes(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeFinalLetter($village, LetterType::factory()->create());
        $kades = $this->makeUserWithPosition('kepala_desa', $village);
        $sekdes = $this->makeUserWithPosition('sekdes', $village);
        $letter->update(['submitted_by' => $kades->id]);

        $this->actingAs($sekdes)
            ->patchJson("/api/kades/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertOk();

        $this->assertDatabaseHas('letter_approvals', [
            'letter_id' => $letter->id,
            'approved_by' => $sekdes->id,
            'approval_level' => 'sekdes',
            'action' => 'approved',
        ]);
    }

    private function makeFinalLetter(Village $village, LetterType $letterType): Letter
    {
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 1,
            'approver_position' => 'kepala_desa',
            'is_final' => true,
        ]);

        return Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'letter_type_id' => $letterType->id,
            'citizen_id' => $citizen->id,
        ]);
    }
}
