<?php

namespace Tests\Unit;

use App\Enums\LetterStatus;
use App\Models\ApprovalFlow;
use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\LetterApproval;
use App\Models\Official;
use App\Models\User;
use App\Models\Village;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use App\Services\KasiApprovalService;
use App\Services\OfficialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

/**
 * EV5-4-S6. Aturan inti yang diuji di sini: KasiApprovalService adalah
 * tahap FINAL (flow_step.is_final=true) - berbeda dari
 * KadesApprovalService yang memajukan current_step_order, di sini
 * status generik (Approved/Rejected) adalah satu-satunya penanda
 * "sudah diputuskan" karena tidak ada step berikutnya untuk dituju.
 */
class KasiApprovalServiceTest extends TestCase
{
    use RefreshDatabase;

    private KasiApprovalService $service;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->service = new KasiApprovalService(
            new OfficialService(new OfficialRepository, new UserRepository, new LetterRepository),
            new LetterRepository,
        );
    }

    /**
     * Membuat surat 2 step (kepala_desa lalu kasi_pelayanan is_final)
     * yang sudah berada di step final kasi_pelayanan, di village
     * tertentu.
     */
    private function makeLetterAtKasiStep(Village $village, string $finalPosition = 'kasi_pelayanan', ?Citizen $citizen = null): Letter
    {
        $citizen ??= Citizen::factory()->create(['village_id' => $village->id]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 1,
            'approver_position' => 'kepala_desa',
            'is_final' => false,
        ]);
        $finalStep = FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 2,
            'approver_position' => $finalPosition,
            'is_final' => true,
        ]);

        return Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => $finalStep->step_order,
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

    // ==========================================
    // getPendingLetters
    // ==========================================

    public function test_get_pending_letters_returns_letters_at_final_kasi_step(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $result = $this->service->getPendingLetters($kasi);

        $this->assertCount(1, $result);
        $this->assertSame($letter->id, $result->first()->id);
    }

    public function test_get_pending_letters_scoped_to_exact_position_not_the_other_kasi_role(): void
    {
        $village = Village::factory()->create();
        $this->makeLetterAtKasiStep($village, 'kaur_tu_umum');
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $result = $this->service->getPendingLetters($kasi);

        $this->assertCount(0, $result);
    }

    public function test_get_pending_letters_excludes_letters_not_yet_at_final_step(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'kepala_desa', 'is_final' => false]);
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 2, 'approver_position' => 'kasi_pelayanan', 'is_final' => true]);

        Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $result = $this->service->getPendingLetters($kasi);

        $this->assertCount(0, $result);
    }

    public function test_get_pending_letters_excludes_already_decided_letters(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->service->decision($letter, $kasi, ['status' => 'approved']);

        $result = $this->service->getPendingLetters($kasi->fresh());

        $this->assertCount(0, $result);
    }

    public function test_get_pending_letters_excludes_letters_in_other_village(): void
    {
        $village = Village::factory()->create();
        $otherVillage = Village::factory()->create();
        $this->makeLetterAtKasiStep($otherVillage);

        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $result = $this->service->getPendingLetters($kasi);

        $this->assertCount(0, $result);
    }

    public function test_get_pending_letters_forbidden_for_non_kasi_role(): void
    {
        $village = Village::factory()->create();
        $rt = $this->makeUserWithPosition('rt', $village);

        $this->expectException(HttpException::class);

        $this->service->getPendingLetters($rt);
    }

    // ==========================================
    // getLetterDetail
    // ==========================================

    public function test_get_letter_detail_returns_letter_in_same_village(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $result = $this->service->getLetterDetail($letter, $kasi);

        $this->assertSame($letter->id, $result->id);
    }

    public function test_get_letter_detail_forbidden_for_other_village(): void
    {
        $village = Village::factory()->create();
        $otherVillage = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($otherVillage);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->expectException(HttpException::class);

        $this->service->getLetterDetail($letter, $kasi);
    }

    // ==========================================
    // decision() - approve
    // ==========================================

    public function test_decision_approve_sets_generic_approved_status(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->service->decision($letter, $kasi, ['status' => 'approved']);

        $this->assertTrue($letter->fresh()->status === LetterStatus::Approved);
    }

    public function test_decision_approve_generates_letter_number_and_expires_at(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->service->decision($letter, $kasi, ['status' => 'approved']);

        $fresh = $letter->fresh();
        $this->assertNotNull($fresh->letter_number);
        $this->assertNotNull($fresh->expires_at);
    }

    public function test_decision_records_approval_level_matching_the_deciding_official(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village, 'kaur_tu_umum');
        $kaur = $this->makeUserWithPosition('kaur_tu_umum', $village);

        $this->service->decision($letter, $kaur, ['status' => 'approved']);

        $this->assertDatabaseHas('letter_approvals', [
            'letter_id' => $letter->id,
            'approval_level' => 'kaur_tu_umum',
            'action' => 'approved',
            'approved_by' => $kaur->id,
        ]);
    }

    // ==========================================
    // decision() - reject
    // ==========================================

    public function test_decision_reject_sets_generic_rejected_status_and_rejected_at_step(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->service->decision($letter, $kasi, ['status' => 'rejected', 'notes' => 'Berkas tidak lengkap']);

        $fresh = $letter->fresh();
        $this->assertTrue($fresh->status === LetterStatus::Rejected);
        $this->assertSame(2, $fresh->rejected_at_step);
        $this->assertNull($fresh->letter_number);
    }

    public function test_decision_reject_without_notes_fails_validation(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->expectException(HttpException::class);

        $this->service->decision($letter, $kasi, ['status' => 'rejected']);
    }

    // ==========================================
    // decision() - guards
    // ==========================================

    public function test_second_decision_on_the_same_letter_is_rejected(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->service->decision($letter, $kasi, ['status' => 'approved']);

        $this->expectException(HttpException::class);

        $this->service->decision($letter->fresh(), $kasi, ['status' => 'approved']);
    }

    public function test_second_decision_does_not_create_a_duplicate_approval_row(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->service->decision($letter, $kasi, ['status' => 'approved']);

        try {
            $this->service->decision($letter->fresh(), $kasi, ['status' => 'approved']);
        } catch (HttpException) {
            // diharapkan gagal, lihat test_second_decision_on_the_same_letter_is_rejected
        }

        $this->assertSame(
            1,
            LetterApproval::query()->where('letter_id', $letter->id)->count()
        );
    }

    public function test_decision_forbidden_for_non_kasi_role(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village);
        $rt = $this->makeUserWithPosition('rt', $village);

        $this->expectException(HttpException::class);

        $this->service->decision($letter, $rt, ['status' => 'approved']);
    }

    public function test_decision_forbidden_when_position_does_not_match_step_position(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($village, 'kaur_tu_umum');
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->expectException(HttpException::class);

        $this->service->decision($letter, $kasi, ['status' => 'approved']);
    }

    public function test_decision_forbidden_when_letter_not_yet_at_final_step(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'kepala_desa', 'is_final' => false]);
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 2, 'approver_position' => 'kasi_pelayanan', 'is_final' => true]);

        $letter = Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->expectException(HttpException::class);

        $this->service->decision($letter, $kasi, ['status' => 'approved']);
    }

    public function test_decision_forbidden_for_letter_in_other_village(): void
    {
        $village = Village::factory()->create();
        $otherVillage = Village::factory()->create();
        $letter = $this->makeLetterAtKasiStep($otherVillage);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->expectException(HttpException::class);

        $this->service->decision($letter, $kasi, ['status' => 'approved']);
    }
}
