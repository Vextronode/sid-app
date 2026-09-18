<?php

namespace Tests\Unit;

use App\Models\ApprovalFlow;
use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use App\Notifications\LetterStatusNotification;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use App\Services\OfficialService;
use App\Services\RtApprovalService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class RtApprovalServiceTest extends TestCase
{
    use RefreshDatabase;

    private RtApprovalService $service;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->service = new RtApprovalService(
            new OfficialService(new OfficialRepository, new UserRepository, new LetterRepository),
            new LetterRepository,
            new OfficialRepository,
        );
    }

    /**
     * Membuat surat yang sedang berada di step 'rt' (step 1 dari flow
     * 2 tahap rt -> kepala_desa), lengkap dengan Rt/Rw wilayah citizen
     * pemohon.
     */
    private function makeLetterAtRtStep(Village $village, ?Rw $rw = null): array
    {
        $rw ??= Rw::factory()->create();
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

    // ==========================================
    // getPendingLetters
    // ==========================================

    public function test_get_pending_letters_throws_when_official_missing(): void
    {
        $user = User::factory()->create(['role' => 'rt']);

        $this->expectException(ModelNotFoundException::class);

        $this->service->getPendingLetters($user);
    }

    public function test_get_pending_letters_forbidden_when_official_has_no_village(): void
    {
        $rt = Rt::factory()->create();
        $official = Official::factory()->create([
            'position' => 'rt',
            'rt_id' => $rt->id,
            'village_id' => null,
            'is_active' => true,
        ]);
        $user = User::factory()->create(['role' => 'rt']);
        $user->official()->save($official);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Data wilayah desa tidak ditemukan.');

        $this->service->getPendingLetters($user->fresh());
    }

    public function test_get_pending_letters_returns_only_letters_at_own_rt_step(): void
    {
        $village = Village::factory()->create();
        ['letter' => $matchingLetter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        // Surat milik RT lain, sama-sama di step 'rt' tapi rt_id beda.
        $this->makeLetterAtRtStep($village);

        $result = $this->service->getPendingLetters($rtUser);

        $this->assertCount(1, $result);
        $this->assertSame($matchingLetter->id, $result->first()->id);
    }

    /**
     * Guard penting: current_step_order TIDAK berubah saat RT reject
     * (tetap di step 1) — tanpa filter status eksplisit, surat yang
     * sudah diputuskan rejected akan tetap "nyangkut" selamanya di
     * daftar pending karena masih match current_step_order + posisi.
     */
    public function test_get_pending_letters_excludes_already_rejected_letters(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        $this->service->decision($letter, $rtUser, ['status' => 'rejected', 'notes' => 'Ditolak']);

        $result = $this->service->getPendingLetters($rtUser);

        $this->assertCount(0, $result);
    }

    // ==========================================
    // decision — approve
    // ==========================================

    public function test_decision_approve_sets_status_in_progress_and_advances_step(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        $this->service->decision($letter, $rtUser, ['status' => 'approved']);

        $this->assertDatabaseHas('letters', [
            'id' => $letter->id,
            'status' => 'in_progress',
            'current_step_order' => 2,
        ]);
    }

    public function test_decision_approve_creates_rt_approval_row(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        $this->service->decision($letter, $rtUser, ['status' => 'approved']);

        $this->assertDatabaseHas('letter_approvals', [
            'letter_id' => $letter->id,
            'approval_level' => 'rt',
            'action' => 'approved',
            'approved_by' => $rtUser->id,
        ]);
    }

    public function test_decision_approve_writes_status_log(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        $this->service->decision($letter, $rtUser, ['status' => 'approved']);

        $this->assertDatabaseHas('letter_status_logs', [
            'letter_id' => $letter->id,
            'old_status' => 'pending',
            'new_status' => 'in_progress',
        ]);
    }

    /**
     * Inti UC-04a Sub-flow Notifikasi RW: RW menerima FYI non-blocking,
     * TIDAK PERNAH membuat row di letter_approvals.
     */
    public function test_decision_approve_does_not_create_rw_approval_row(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt, 'rw' => $rw] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        $rwOfficial = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id, 'village_id' => $village->id]);
        $rwUser = User::factory()->create(['role' => 'rw']);
        $rwUser->official()->save($rwOfficial);

        $this->service->decision($letter, $rtUser, ['status' => 'approved']);

        $this->assertDatabaseMissing('letter_approvals', [
            'letter_id' => $letter->id,
            'approval_level' => 'rw',
        ]);
    }

    public function test_decision_approve_notifies_rw_official_as_fyi(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt, 'rw' => $rw] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        $rwOfficial = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id, 'village_id' => $village->id]);
        $rwUser = User::factory()->create(['role' => 'rw']);
        $rwUser->official()->save($rwOfficial);

        $this->service->decision($letter, $rtUser, ['status' => 'approved']);

        Notification::assertSentTo($rwUser->fresh(), LetterStatusNotification::class);
    }

    /**
     * Absennya RW aktif tidak boleh menghentikan alur (fallback kosong
     * dilewati begitu saja, bukan error) — RW tidak pernah jadi gate.
     */
    public function test_decision_approve_succeeds_even_without_active_rw(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        $this->service->decision($letter, $rtUser, ['status' => 'approved']);

        $this->assertDatabaseHas('letters', ['id' => $letter->id, 'status' => 'in_progress']);
    }

    public function test_decision_approve_notifies_next_approver_generically(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        $kadesOfficial = Official::factory()->create(['position' => 'kepala_desa', 'village_id' => $village->id]);
        $kadesUser = User::factory()->create(['role' => 'kepala_desa']);
        $kadesUser->official()->save($kadesOfficial);

        $this->service->decision($letter, $rtUser, ['status' => 'approved']);

        Notification::assertSentTo($kadesUser->fresh(), LetterStatusNotification::class);
    }

    public function test_decision_approve_notifies_applicant(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt, 'citizen' => $citizen] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        $applicantUser = User::factory()->create(['citizen_id' => $citizen->id]);

        $this->service->decision($letter, $rtUser, ['status' => 'approved']);

        Notification::assertSentTo($applicantUser->fresh(), LetterStatusNotification::class);
    }

    // ==========================================
    // decision — reject
    // ==========================================

    public function test_decision_reject_sets_status_rejected_and_records_step(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        $this->service->decision($letter, $rtUser, ['status' => 'rejected', 'notes' => 'Data tidak lengkap']);

        $this->assertDatabaseHas('letters', [
            'id' => $letter->id,
            'status' => 'rejected',
            'rejected_at_step' => 1,
            'current_step_order' => 1,
        ]);
    }

    public function test_decision_reject_does_not_notify_rw_or_next_approver(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt, 'rw' => $rw] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        $rwOfficial = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id, 'village_id' => $village->id]);
        $rwUser = User::factory()->create(['role' => 'rw']);
        $rwUser->official()->save($rwOfficial);

        $this->service->decision($letter, $rtUser, ['status' => 'rejected', 'notes' => 'Tidak sesuai']);

        Notification::assertNotSentTo($rwUser->fresh(), LetterStatusNotification::class);
    }

    public function test_decision_reject_requires_notes(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Alasan penolakan wajib diisi.');

        $this->service->decision($letter, $rtUser, ['status' => 'rejected']);
    }

    // ==========================================
    // decision — guard/forbidden
    // ==========================================

    public function test_decision_forbidden_when_rt_mismatch(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter] = $this->makeLetterAtRtStep($village);

        $otherRt = Rt::factory()->create();
        $rtUser = $this->makeRtUser($village, $otherRt);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Anda tidak berwenang memproses surat ini.');

        $this->service->decision($letter, $rtUser, ['status' => 'approved']);
    }

    public function test_decision_forbidden_when_letter_not_at_rt_step(): void
    {
        $village = Village::factory()->create();
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['village_id' => $village->id, 'rt_id' => $rt->id]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'rt']);
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 2, 'approver_position' => 'kepala_desa']);

        $letter = Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 2, // sudah lewat step RT
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
            'status' => 'in_progress',
        ]);

        $rtUser = $this->makeRtUser($village, $rt);

        $this->expectException(HttpException::class);

        $this->service->decision($letter, $rtUser, ['status' => 'approved']);
    }

    public function test_decision_invalid_status_value_is_rejected(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Status keputusan tidak valid.');

        $this->service->decision($letter, $rtUser, ['status' => 'in_progress']);
    }
}
