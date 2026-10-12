<?php

namespace Tests\Unit;

use App\Models\ApprovalFlow;
use App\Models\FlowStep;
use App\Models\Village;
use App\Repositories\ApprovalFlowRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-1-S2 — Unit test untuk ApprovalFlowRepository.
 *
 * PENTING: test ini butuh tabel `flow_steps` (EV5-1-S3) ikut termigrasi
 * karena ApprovalFlowRepository selalu eager-load relasi steps(). Saat
 * menjalankan test folder ini secara berdiri sendiri, pastikan migration
 * dari EV5-1-S1 + EV5-1-S3 juga sudah digabung ke project (lihat README
 * folder ini).
 *
 * Cakupan kondisi:
 *  - findById() menemukan flow yang ada.
 *  - findById() null untuk id yang tidak ada.
 *  - findWithSteps() mengembalikan flow beserta steps terurut step_order.
 *  - findWithSteps() tetap mengembalikan flow meski steps kosong (kategori
 *    non-approval_normal, sesuai desain "Direct - Tanpa Approval Bertingkat").
 *  - allActive() hanya mengembalikan flow is_active=true.
 */
class ApprovalFlowRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private ApprovalFlowRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new ApprovalFlowRepository;
    }

    #[Test]
    public function find_by_id_returns_existing_flow(): void
    {
        $flow = $this->makeFlow('RT-Kades/Sekdes (2 Tahap)');

        $found = $this->repository->findById($flow->id);

        $this->assertNotNull($found);
        $this->assertSame($flow->id, $found->id);
    }

    #[Test]
    public function find_by_id_returns_null_for_nonexistent_flow(): void
    {
        $found = $this->repository->findById(99999);

        $this->assertNull($found);
    }

    #[Test]
    public function find_with_steps_eager_loads_steps_ordered_by_step_order(): void
    {
        $flow = $this->makeFlow('RT-Kades/Sekdes (2 Tahap)');

        // Gunakan nomor unik sesuai constraint flow_steps dan insert
        // tidak berurutan untuk membuktikan hasil tetap di-order.
        FlowStep::query()->create([
            'flow_id' => $flow->id, 'step_order' => 3,
            'approver_position' => 'kepala_desa', 'is_final' => true,
        ]);
        FlowStep::query()->create([
            'flow_id' => $flow->id, 'step_order' => 1,
            'approver_position' => 'rt', 'is_final' => false,
        ]);
        FlowStep::query()->create([
            'flow_id' => $flow->id, 'step_order' => 2,
            'approver_position' => 'kepala_desa', 'is_final' => false,
        ]);

        $found = $this->repository->findWithSteps($flow->id);

        $this->assertNotNull($found);
        $this->assertTrue($found->relationLoaded('steps'));
        $this->assertCount(3, $found->steps);
        $this->assertSame([1, 2, 3], $found->steps->pluck('step_order')->all());
        $this->assertSame('rt', $found->steps->first()->approver_position);
        $this->assertTrue($found->steps->last()->is_final);
        $this->assertSame('kepala_desa', $found->steps->last()->approver_position);
    }

    #[Test]
    public function find_with_steps_returns_flow_with_empty_steps_collection(): void
    {
        $flow = $this->makeFlow('Direct - Tanpa Approval Bertingkat');

        $found = $this->repository->findWithSteps($flow->id);

        $this->assertNotNull($found);
        $this->assertTrue($found->steps->isEmpty());
    }

    #[Test]
    public function find_with_steps_returns_null_for_nonexistent_flow(): void
    {
        $found = $this->repository->findWithSteps(99999);

        $this->assertNull($found);
    }

    #[Test]
    public function all_active_excludes_inactive_flows(): void
    {
        $activeFlow = $this->makeFlow('Flow Aktif', true);
        $this->makeFlow('Flow Nonaktif', false);

        $result = $this->repository->allActive();

        $this->assertCount(1, $result);
        $this->assertSame($activeFlow->id, $result->first()->id);
    }

    private function makeFlow(string $name, bool $isActive = true): ApprovalFlow
    {
        return ApprovalFlow::query()->create([
            'village_id' => Village::query()->value('id') ?? Village::factory()->create()->id,
            'name' => $name,
            'description' => null,
            'is_active' => $isActive,
        ]);
    }
}
