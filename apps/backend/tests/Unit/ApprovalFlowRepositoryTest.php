<?php

namespace Tests\Unit;

use App\Models\ApprovalFlow;
use App\Models\FlowStep;
use App\Models\LetterCategory;
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
 *  - findByCategoryId() hanya mengembalikan flow milik kategori tsb.
 *  - findByCategoryId() mengembalikan collection kosong jika kategori tidak
 *    punya flow apapun.
 *  - allActive() hanya mengembalikan flow is_active=true.
 *  - create() menyimpan flow baru dengan attribute yang diberikan.
 *  - replaceSteps() menghapus steps lama dan membuat steps baru (replace-all).
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
        $category = $this->makeCategory('approval_normal');
        $flow = $this->makeFlow($category, 'RT-Kades-Staff (3 Tahap)');

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
        $category = $this->makeCategory('approval_normal');
        $flow = $this->makeFlow($category, 'RT-Kades-Staff (3 Tahap)');

        // Sengaja insert TIDAK berurutan untuk membuktikan hasil tetap
        // di-order oleh step_order, bukan oleh urutan insert.
        FlowStep::query()->create([
            'flow_id' => $flow->id, 'step_order' => 3,
            'approver_position' => 'kasi_pelayanan', 'is_final' => true,
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
    }

    #[Test]
    public function find_with_steps_returns_flow_with_empty_steps_collection(): void
    {
        $category = $this->makeCategory('upload_mandiri');
        $flow = $this->makeFlow($category, 'Direct - Tanpa Approval Bertingkat');

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
    public function find_by_category_id_only_returns_flows_of_that_category(): void
    {
        $categoryA = $this->makeCategory('approval_normal');
        $categoryB = $this->makeCategory('upload_mandiri');

        $flowA = $this->makeFlow($categoryA, 'RT-Kades-Staff (3 Tahap)');
        $this->makeFlow($categoryB, 'Direct - Tanpa Approval Bertingkat');

        $result = $this->repository->findByCategoryId($categoryA->id);

        $this->assertCount(1, $result);
        $this->assertSame($flowA->id, $result->first()->id);
    }

    #[Test]
    public function find_by_category_id_returns_empty_collection_when_category_has_no_flow(): void
    {
        $category = $this->makeCategory('update_data');

        $result = $this->repository->findByCategoryId($category->id);

        $this->assertTrue($result->isEmpty());
    }

    #[Test]
    public function all_active_excludes_inactive_flows(): void
    {
        $category = $this->makeCategory('approval_normal');
        $activeFlow = $this->makeFlow($category, 'Flow Aktif', true);
        $this->makeFlow($category, 'Flow Nonaktif', false);

        $result = $this->repository->allActive();

        $this->assertCount(1, $result);
        $this->assertSame($activeFlow->id, $result->first()->id);
    }

    #[Test]
    public function a_category_can_have_multiple_flows_config_over_code(): void
    {
        // Menegaskan prinsip Config over Code (SID-ARCH-SYS-001 S1):
        // 1 category boleh punya banyak flow berbeda.
        $category = $this->makeCategory('approval_normal');
        $this->makeFlow($category, 'Flow Standar (3 Tahap)');
        $this->makeFlow($category, 'Flow Ringkas (2 Tahap)');

        $result = $this->repository->findByCategoryId($category->id);

        $this->assertCount(2, $result);
    }

    #[Test]
    public function create_persists_new_flow_with_given_attributes(): void
    {
        $category = $this->makeCategory('approval_normal');

        $flow = $this->repository->create([
            'category_id' => $category->id,
            'name' => 'Flow Baru Dari Repository',
            'description' => 'Dibuat via repository',
            'is_active' => true,
        ]);

        $this->assertNotNull($flow->id);
        $this->assertSame('Flow Baru Dari Repository', $flow->name);
        $this->assertDatabaseHas('approval_flows', [
            'id' => $flow->id,
            'category_id' => $category->id,
            'name' => 'Flow Baru Dari Repository',
        ]);
    }

    #[Test]
    public function replace_steps_deletes_old_steps_and_creates_new_ones(): void
    {
        $category = $this->makeCategory('approval_normal');
        $flow = $this->makeFlow($category, 'Flow Dengan Steps');

        FlowStep::query()->create([
            'flow_id' => $flow->id, 'step_order' => 1,
            'approver_position' => 'rt', 'is_final' => true,
        ]);

        $newSteps = $this->repository->replaceSteps($flow, [
            ['step_order' => 1, 'approver_position' => 'rt', 'is_final' => false],
            ['step_order' => 2, 'approver_position' => 'kasi_pelayanan', 'is_final' => true],
        ]);

        $this->assertCount(2, $newSteps);
        $this->assertDatabaseCount('flow_steps', 2);
        $this->assertDatabaseHas('flow_steps', [
            'flow_id' => $flow->id, 'step_order' => 2, 'approver_position' => 'kasi_pelayanan',
        ]);
    }

    private function makeCategory(string $code): LetterCategory
    {
        return LetterCategory::query()->create([
            'code' => $code,
            'name' => ucfirst(str_replace('_', ' ', $code)),
            'handler_class' => 'App\\Services\\Letters\\Handler',
            'is_active' => true,
        ]);
    }

    private function makeFlow(LetterCategory $category, string $name, bool $isActive = true): ApprovalFlow
    {
        return ApprovalFlow::query()->create([
            'category_id' => $category->id,
            'name' => $name,
            'description' => null,
            'is_active' => $isActive,
        ]);
    }
}
