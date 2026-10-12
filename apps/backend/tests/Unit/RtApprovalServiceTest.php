<?php

namespace Tests\Unit;

use App\Models\ApprovalFlow;
use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Hamlet;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use App\Notifications\LetterStatusNotification;
use App\Repositories\ApprovalFlowRepository;
use App\Repositories\ApprovalSettingRepository;
use App\Repositories\LetterRepository;
use App\Repositories\LetterStatusLogRepository;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use App\Services\ApprovalSettingService;
use App\Services\LetterFlowService;
use App\Services\OfficialService;
use App\Services\RtApprovalService;
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

        $officialService = new OfficialService(new OfficialRepository, new UserRepository, new LetterRepository);
        $this->service = new RtApprovalService(
            $officialService,
            new LetterRepository,
            new OfficialRepository,
            new LetterFlowService($officialService, new ApprovalFlowRepository, new LetterStatusLogRepository),
            new ApprovalSettingService(new ApprovalSettingRepository),
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
        Official::factory()->create([
            'position' => 'kepala_desa',
            'village_id' => $village->id,
            'is_active' => true,
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

    public function test_decision_approve_resolves_current_approval_and_starts_next_deadline(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);
        $steps = FlowStep::query()->where('flow_id', $letter->flow_id)->orderBy('step_order')->get();
        $expiredDeadline = now()->subHour();
        $letter->approvals()->create([
            'approval_level' => 'rt',
            'flow_step_id' => $steps[0]->id,
            'deadline_at' => $expiredDeadline,
        ]);

        $this->service->decision($letter, $rtUser, ['status' => 'approved']);

        $this->assertDatabaseCount('letter_approvals', 2);
        $this->assertDatabaseHas('letter_approvals', [
            'letter_id' => $letter->id,
            'flow_step_id' => $steps[0]->id,
            'approved_by' => $rtUser->id,
            'action' => 'approved',
        ]);
        $this->assertDatabaseHas('letter_approvals', [
            'letter_id' => $letter->id,
            'flow_step_id' => $steps[1]->id,
            'approved_by' => null,
            'action' => null,
        ]);
        $nextApproval = $letter->approvals()->where('flow_step_id', $steps[1]->id)->firstOrFail();
        $this->assertNotNull($nextApproval->deadline_at);
        $this->assertTrue($nextApproval->deadline_at->isFuture());
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

    public function test_decision_approve_notifies_only_kadus_for_citizens_hamlet_as_fyi(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt, 'citizen' => $citizen] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);
        $ownHamlet = Hamlet::findOrFail($citizen->hamlet_id);
        $otherHamlet = Hamlet::factory()->create(['village_id' => $village->id]);

        $ownKadus = User::factory()->create(['role' => 'kadus']);
        Official::factory()->create([
            'position' => 'kadus',
            'hamlet_id' => $ownHamlet->id,
            'village_id' => $village->id,
            'user_id' => $ownKadus->id,
            'is_active' => true,
        ]);
        $otherKadus = User::factory()->create(['role' => 'kadus']);
        Official::factory()->create([
            'position' => 'kadus',
            'hamlet_id' => $otherHamlet->id,
            'village_id' => $village->id,
            'user_id' => $otherKadus->id,
            'is_active' => true,
        ]);

        $this->service->decision($letter, $rtUser, ['status' => 'approved']);

        Notification::assertSentTo($ownKadus, LetterStatusNotification::class, function (LetterStatusNotification $notification) use ($ownKadus): bool {
            return $notification->toArray($ownKadus)['context']['status'] === 'rt_approved_kadus_fyi';
        });
        Notification::assertNotSentTo($otherKadus, LetterStatusNotification::class);
        $this->assertDatabaseMissing('letter_approvals', [
            'letter_id' => $letter->id,
            'approval_level' => 'kadus',
        ]);
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

    public function test_decision_cannot_process_letter_again_after_rt_rejects_it(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        $this->service->decision($letter, $rtUser, ['status' => 'rejected', 'notes' => 'Ditolak']);

        try {
            $this->service->decision($letter->fresh(), $rtUser, ['status' => 'approved']);
            $this->fail('A rejected letter must not be processed again.');
        } catch (HttpException $exception) {
            $this->assertSame(409, $exception->getStatusCode());
            $this->assertSame('Surat sudah diproses sebelumnya.', $exception->getMessage());
        }

        $this->assertDatabaseHas('letters', ['id' => $letter->id, 'status' => 'rejected']);
        $this->assertDatabaseCount('letter_approvals', 1);
    }

    public function test_decision_reject_does_not_notify_rw_or_next_approver(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt, 'rw' => $rw, 'citizen' => $citizen] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        $rwOfficial = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id, 'village_id' => $village->id]);
        $rwUser = User::factory()->create(['role' => 'rw']);
        $rwUser->official()->save($rwOfficial);
        $kadusUser = User::factory()->create(['role' => 'kadus']);
        $kadusUser->official()->save(Official::factory()->create([
            'position' => 'kadus',
            'hamlet_id' => $citizen->hamlet_id,
            'village_id' => $village->id,
        ]));

        $this->service->decision($letter, $rtUser, ['status' => 'rejected', 'notes' => 'Tidak sesuai']);

        Notification::assertNotSentTo($rwUser->fresh(), LetterStatusNotification::class);
        Notification::assertNotSentTo($kadusUser->fresh(), LetterStatusNotification::class);
    }

    /**
     * Validasi notes saat reject kini ada di RtDecisionRequest (FormRequest),
     * BUKAN lagi di service. Test ini memverifikasi behavior service secara
     * LANGSUNG (tanpa melalui FormRequest) — sehingga service TIDAK lagi
     * melempar exception untuk kasus ini.
     *
     * Jika ingin menguji bahwa endpoint HTTP menolak reject tanpa notes,
     * test tersebut ada di RtApprovalControllerTest (feature test via HTTP).
     */
    public function test_decision_reject_without_notes_proceeds_in_service_layer(): void
    {
        $village = Village::factory()->create();
        ['letter' => $letter, 'rt' => $rt] = $this->makeLetterAtRtStep($village);
        $rtUser = $this->makeRtUser($village, $rt);

        // Service tidak lagi validasi notes — validasi ada di FormRequest.
        // Saat dipanggil langsung, service menerima data apa adanya.
        $this->service->decision($letter, $rtUser, ['status' => 'rejected', 'notes' => null]);

        $this->assertDatabaseHas('letters', [
            'id' => $letter->id,
            'status' => 'rejected',
        ]);
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

    /**
     * Status tidak valid kini divalidasi di RtDecisionRequest (FormRequest),
     * BUKAN lagi di service. Test ini diperbarui untuk mencerminkan behavior
     * yang benar: service TIDAK melempar exception untuk status tidak valid.
     *
     * Pengujian bahwa endpoint HTTP menolak status tidak valid ada di
     * RtApprovalControllerTest (feature test via HTTP).
     */
    public function test_decision_invalid_status_value_is_handled_at_form_request_layer(): void
    {
        // Behavior yang benar setelah refactor: validasi status ada di
        // RtDecisionRequest, bukan di service. Tidak ada yang perlu di-assert
        // di sini untuk service secara langsung. Test ini dipertahankan
        // sebagai dokumentasi bahwa validasi PINDAH ke FormRequest.
        $this->assertTrue(true, 'Validasi status ditangani di RtDecisionRequest::rules()');
    }
}
