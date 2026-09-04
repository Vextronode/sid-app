<?php

namespace Tests\Unit;

use App\Models\ApprovalFlow;
use App\Models\FlowStep;
use App\Models\LetterCategory;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-1-S3 (KOREKSI) — Unit test untuk model FlowStep.
 *
 * PENTING: test ini butuh tabel `letter_categories` (EV5-1-S1) dan
 * `approval_flows` (EV5-1-S2) ikut termigrasi karena flow_steps punya FK
 * ke approval_flows. Gabungkan ketiga migration EV5-1-S1/S2/S3 saat
 * menjalankan test folder ini.
 *
 * Cakupan kondisi:
 *  - isRegionBased() true HANYA untuk approver_position='rt'.
 *  - isRegionBased() false untuk keempat posisi berbasis-posisi lainnya.
 *  - resolvablePositions() SELALU mengembalikan array 1 elemen berisi
 *    approver_position itu sendiri — ini murni konsekuensi skema (kolom
 *    approver_position bernilai tunggal per row), BUKAN penegasan
 *    keputusan bisnis soal Sekdes (pertanyaan itu MASIH TERBUKA, lihat
 *    EV5-1-S4_OPEN_QUESTION_SEKDES.md — blocking untuk EV5-4-S5, bukan
 *    ditentukan di sini).
 *  - resolvablePositions() untuk step 'kepala_desa' TIDAK mengandung 'sekdes'
 *    — karena memang tidak pernah ada di kolom itu sendiri (satu row =
 *    satu value), bukan karena logic resolve officials sudah diputuskan.
 *  - is_final di-cast ke boolean.
 *  - step_order di-cast ke integer.
 *  - Constraint UNIQUE(flow_id, step_order) dijaga di level DB.
 *  - relasi flow() mengembalikan ApprovalFlow yang benar.
 */
class FlowStepModelTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function is_region_based_is_true_only_for_rt(): void
    {
        $flow = $this->makeFlow();

        $rtStep = FlowStep::query()->create([
            'flow_id' => $flow->id, 'step_order' => 1,
            'approver_position' => 'rt', 'is_final' => false,
        ]);

        $this->assertTrue($rtStep->isRegionBased());
    }

    #[DataProvider('positionBasedApproverPositions')]
    #[Test]
    public function is_region_based_is_false_for_position_based_approvers(string $position): void
    {
        $flow = $this->makeFlow();

        $step = FlowStep::query()->create([
            'flow_id' => $flow->id, 'step_order' => 1,
            'approver_position' => $position, 'is_final' => false,
        ]);

        $this->assertFalse($step->isRegionBased());
    }

    public static function positionBasedApproverPositions(): array
    {
        return [
            'kepala_desa' => ['kepala_desa'],
            'sekdes' => ['sekdes'],
            'kasi_pelayanan' => ['kasi_pelayanan'],
            'kaur_tu_umum' => ['kaur_tu_umum'],
        ];
    }

    #[Test]
    public function resolvable_positions_always_returns_single_element_array(): void
    {
        // Ini konsekuensi SKEMA (kolom approver_position bernilai tunggal
        // per row di flow_steps), BUKAN penegasan keputusan bisnis Sekdes
        // — pertanyaan itu masih terbuka, lihat
        // EV5-1-S4_OPEN_QUESTION_SEKDES.md. File
        // EV5-1_DECISION_LOG_SEKDES_NOT_APPROVER.md yang tadinya dirujuk
        // di sini SUDAH DIHAPUS karena isinya klaim yang tidak benar.
        $flow = $this->makeFlow();

        $step = FlowStep::query()->create([
            'flow_id' => $flow->id, 'step_order' => 2,
            'approver_position' => 'kepala_desa', 'is_final' => false,
        ]);

        $positions = $step->resolvablePositions();

        $this->assertCount(1, $positions);
        $this->assertSame(['kepala_desa'], $positions);
    }

    #[Test]
    public function resolvable_positions_for_kepala_desa_step_never_includes_sekdes(): void
    {
        $flow = $this->makeFlow();

        $step = FlowStep::query()->create([
            'flow_id' => $flow->id, 'step_order' => 2,
            'approver_position' => 'kepala_desa', 'is_final' => false,
        ]);

        $this->assertNotContains('sekdes', $step->resolvablePositions());
    }

    #[Test]
    public function is_final_is_cast_to_boolean(): void
    {
        $flow = $this->makeFlow();

        $step = FlowStep::query()->create([
            'flow_id' => $flow->id, 'step_order' => 3,
            'approver_position' => 'kasi_pelayanan', 'is_final' => 1,
        ]);

        $this->assertIsBool($step->fresh()->is_final);
        $this->assertTrue($step->fresh()->is_final);
    }

    #[Test]
    public function step_order_is_cast_to_integer(): void
    {
        $flow = $this->makeFlow();

        $step = FlowStep::query()->create([
            'flow_id' => $flow->id, 'step_order' => '2',
            'approver_position' => 'kepala_desa', 'is_final' => false,
        ]);

        $this->assertIsInt($step->fresh()->step_order);
    }

    #[Test]
    public function unique_constraint_on_flow_id_and_step_order_is_enforced(): void
    {
        $flow = $this->makeFlow();

        FlowStep::query()->create([
            'flow_id' => $flow->id, 'step_order' => 1,
            'approver_position' => 'rt', 'is_final' => false,
        ]);

        $this->expectException(QueryException::class);

        FlowStep::query()->create([
            'flow_id' => $flow->id, 'step_order' => 1,
            'approver_position' => 'kepala_desa', 'is_final' => false,
        ]);
    }

    #[Test]
    public function same_step_order_is_allowed_across_different_flows(): void
    {
        $flowA = $this->makeFlow('Flow A');
        $flowB = $this->makeFlow('Flow B');

        FlowStep::query()->create([
            'flow_id' => $flowA->id, 'step_order' => 1,
            'approver_position' => 'rt', 'is_final' => false,
        ]);

        $stepB = FlowStep::query()->create([
            'flow_id' => $flowB->id, 'step_order' => 1,
            'approver_position' => 'rt', 'is_final' => false,
        ]);

        $this->assertNotNull($stepB->id);
        $this->assertDatabaseCount('flow_steps', 2);
    }

    #[Test]
    public function flow_relation_returns_the_owning_approval_flow(): void
    {
        $flow = $this->makeFlow();

        $step = FlowStep::query()->create([
            'flow_id' => $flow->id, 'step_order' => 1,
            'approver_position' => 'rt', 'is_final' => false,
        ]);

        $this->assertInstanceOf(ApprovalFlow::class, $step->flow);
        $this->assertSame($flow->id, $step->flow->id);
    }

    private function makeFlow(string $name = 'RT-Kades-Staff (3 Tahap)'): ApprovalFlow
    {
        // firstOrCreate: LetterCategory.code UNIQUE, jadi kategori yang
        // sama dipakai ulang antar pemanggilan makeFlow() dalam 1 test
        // (misal saat menguji 2 flow berbeda di kategori yang sama).
        $category = LetterCategory::query()->firstOrCreate(
            ['code' => 'approval_normal'],
            [
                'name' => 'Approval Normal',
                'handler_class' => 'App\\Services\\Letters\\ApprovalNormalHandler',
                'is_active' => true,
            ],
        );

        return ApprovalFlow::query()->create([
            'category_id' => $category->id,
            'name' => $name,
            'is_active' => true,
        ]);
    }
}
