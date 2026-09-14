<?php

namespace Tests\Unit;

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
use App\Services\KadesApprovalService;
use App\Services\OfficialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

/**
 * EV5-4-S5. Aturan inti yang diuji di sini: Kepala Desa dan Sekdes
 * SALING MENGGANTIKAN untuk step 'kepala_desa' (first-come-first-served)
 * — lihat docblock KadesApprovalService untuk konteks lengkap.
 */
class KadesApprovalServiceTest extends TestCase
{
    use RefreshDatabase;

    private KadesApprovalService $service;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->service = new KadesApprovalService(
            new LetterRepository,
            new OfficialService(new OfficialRepository, new UserRepository),
        );
    }

    /**
     * Membuat surat yang sedang berada di step 'kepala_desa' pada
     * sebuah flow 1-step, di village tertentu.
     */
    private function makeLetterAtKadesStep(Village $village, ?Citizen $citizen = null): Letter
    {
        $citizen ??= Citizen::factory()->create(['village_id' => $village->id]);

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

    // ==========================================
    // getPendingLetters
    // ==========================================

    public function test_get_pending_letters_returns_letters_at_kades_step(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $result = $this->service->getPendingLetters($kades);

        $this->assertCount(1, $result);
        $this->assertSame($letter->id, $result->first()->id);
    }

    public function test_get_pending_letters_visible_to_sekdes_too(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $sekdes = $this->makeUserWithPosition('sekdes', $village);

        $result = $this->service->getPendingLetters($sekdes);

        $this->assertCount(1, $result);
        $this->assertSame($letter->id, $result->first()->id);
    }

    public function test_get_pending_letters_excludes_letters_not_at_kades_step(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'rt']);
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 2, 'approver_position' => 'kepala_desa']);

        Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $result = $this->service->getPendingLetters($kades);

        $this->assertCount(0, $result);
    }

    public function test_get_pending_letters_excludes_letters_in_other_village(): void
    {
        $village = Village::factory()->create();
        $otherVillage = Village::factory()->create();
        $this->makeLetterAtKadesStep($otherVillage);

        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $result = $this->service->getPendingLetters($kades);

        $this->assertCount(0, $result);
    }

    public function test_get_pending_letters_forbidden_for_non_kades_role(): void
    {
        $village = Village::factory()->create();
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->expectException(HttpException::class);

        $this->service->getPendingLetters($kasi);
    }

    // ==========================================
    // getLetterDetail
    // ==========================================

    public function test_get_letter_detail_returns_letter_in_same_village(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $result = $this->service->getLetterDetail($letter, $kades);

        $this->assertSame($letter->id, $result->id);
    }

    public function test_get_letter_detail_forbidden_for_other_village(): void
    {
        $village = Village::factory()->create();
        $otherVillage = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($otherVillage);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $this->expectException(HttpException::class);

        $this->service->getLetterDetail($letter, $kades);
    }

    // ==========================================
    // decision() — inti aturan saling-menggantikan
    // ==========================================

    public function test_decision_approve_by_kades_advances_step_order(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $this->service->decision($letter, $kades, ['status' => 'approved']);

        $this->assertSame(2, $letter->fresh()->current_step_order);
    }

    public function test_decision_approve_by_sekdes_also_advances_step_order(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $sekdes = $this->makeUserWithPosition('sekdes', $village);

        $this->service->decision($letter, $sekdes, ['status' => 'approved']);

        $this->assertSame(2, $letter->fresh()->current_step_order);
    }

    public function test_decision_records_approval_level_matching_the_deciding_official(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $sekdes = $this->makeUserWithPosition('sekdes', $village);

        $this->service->decision($letter, $sekdes, ['status' => 'approved']);

        $this->assertDatabaseHas('letter_approvals', [
            'letter_id' => $letter->id,
            'approval_level' => 'sekdes',
            'action' => 'approved',
            'approved_by' => $sekdes->id,
        ]);
    }

    public function test_decision_reject_sets_rejected_at_step_and_does_not_advance(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $this->service->decision($letter, $kades, ['status' => 'rejected', 'notes' => 'Dokumen tidak lengkap']);

        $fresh = $letter->fresh();
        $this->assertSame(1, $fresh->current_step_order);
        $this->assertSame(1, $fresh->rejected_at_step);
    }

    public function test_decision_reject_without_notes_fails_validation(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $this->expectException(HttpException::class);

        $this->service->decision($letter, $kades, ['status' => 'rejected']);
    }

    /**
     * INTI aturan "siapa cepat dia dapat": begitu Kades sudah
     * memutuskan, Sekdes tidak bisa lagi memutuskan surat yang sama
     * (step sudah maju, currentFlowStep() bukan lagi 'kepala_desa').
     */
    public function test_second_decision_by_the_other_official_is_rejected(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);
        $sekdes = $this->makeUserWithPosition('sekdes', $village);

        $this->service->decision($letter, $kades, ['status' => 'approved']);

        $this->expectException(HttpException::class);

        $this->service->decision($letter->fresh(), $sekdes, ['status' => 'approved']);
    }

    public function test_second_decision_does_not_create_a_duplicate_approval_row(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);
        $sekdes = $this->makeUserWithPosition('sekdes', $village);

        $this->service->decision($letter, $kades, ['status' => 'approved']);

        try {
            $this->service->decision($letter->fresh(), $sekdes, ['status' => 'approved']);
        } catch (HttpException) {
            // diharapkan gagal, lihat test_second_decision_by_the_other_official_is_rejected
        }

        $this->assertSame(
            1,
            LetterApproval::query()->where('letter_id', $letter->id)->count()
        );
    }

    public function test_decision_forbidden_for_non_kades_role(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kasi = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->expectException(HttpException::class);

        $this->service->decision($letter, $kasi, ['status' => 'approved']);
    }

    public function test_decision_forbidden_when_letter_not_at_kades_step(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'rt']);
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 2, 'approver_position' => 'kepala_desa']);

        $letter = Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $this->expectException(HttpException::class);

        $this->service->decision($letter, $kades, ['status' => 'approved']);
    }

    public function test_decision_forbidden_for_letter_in_other_village(): void
    {
        $village = Village::factory()->create();
        $otherVillage = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($otherVillage);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $this->expectException(HttpException::class);

        $this->service->decision($letter, $kades, ['status' => 'approved']);
    }

    public function test_decision_does_not_write_letter_status_column(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetterAtKadesStep($village);
        $kades = $this->makeUserWithPosition('kepala_desa', $village);

        $this->service->decision($letter, $kades, ['status' => 'approved']);

        // status kolom TIDAK disentuh sama sekali — tetap 'pending'
        // (lihat catatan status di docblock KadesApprovalService).
        $this->assertDatabaseHas('letters', [
            'id' => $letter->id,
            'status' => 'pending',
        ]);
    }
}
