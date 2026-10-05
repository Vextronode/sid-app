<?php

namespace Tests\Unit;

use App\Models\ApprovalFlow;
use App\Models\FlowStep;
use App\Models\LetterCategory;
use App\Repositories\ApprovalFlowRepository;
use App\Services\ApprovalFlowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

/**
 * EV5-1-S2/S3 — Unit test untuk ApprovalFlowService.
 *
 * Service adalah layer business logic di antara Controller dan
 * Repository (pattern Controller -> Service -> Repository -> Model).
 * Test ini memastikan Service benar-benar mendelegasikan ke Repository
 * dan menangani orkestrasi (404 saat flow tidak ditemukan) dengan
 * benar, TANPA menyentuh Eloquent query builder secara langsung.
 *
 * Cakupan kondisi:
 *  - list() memanggil allActive() saat category_id null.
 *  - list() memanggil findByCategoryId() saat category_id diberikan.
 *  - findWithStepsOrFail() mengembalikan flow beserta steps.
 *  - findWithStepsOrFail() melempar 404 untuk flow yang tidak ada.
 *  - create() menyimpan flow baru lewat repository.
 *  - replaceSteps() melempar 404 untuk flow yang tidak ada.
 *  - replaceSteps() mendelegasikan replace-all ke repository untuk flow
 *    yang ada.
 */
class ApprovalFlowServiceTest extends TestCase
{
    use RefreshDatabase;

    private ApprovalFlowService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new ApprovalFlowService(new ApprovalFlowRepository);
    }

    #[Test]
    public function list_returns_only_active_flows_when_no_category_given(): void
    {
        $user = $this->makePetugasDesaActor();
        $category = $this->makeCategory('approval_normal');
        $this->makeFlow($category, 'Flow Aktif', true, $user->village_id);
        $this->makeFlow($category, 'Flow Nonaktif', false, $user->village_id);

        $result = $this->service->list($user, null);

        $this->assertCount(1, $result);
        $this->assertSame('Flow Aktif', $result->first()->name);
    }

    #[Test]
    public function list_filters_by_category_id_when_given(): void
    {
        $user = $this->makePetugasDesaActor();
        $categoryA = $this->makeCategory('approval_normal');
        $categoryB = $this->makeCategory('upload_mandiri');
        $flowA = $this->makeFlow($categoryA, 'Flow A', true, $user->village_id);
        $this->makeFlow($categoryB, 'Flow B', true, $user->village_id);

        $result = $this->service->list($user, $categoryA->id);

        $this->assertCount(1, $result);
        $this->assertSame($flowA->id, $result->first()->id);
    }

    #[Test]
    public function find_with_steps_or_fail_returns_flow_with_steps(): void
    {
        $user = $this->makePetugasDesaActor();
        $category = $this->makeCategory('approval_normal');
        $flow = $this->makeFlow($category, 'Flow Detail', true, $user->village_id);

        $found = $this->service->findWithStepsOrFail($flow->id, $user);

        $this->assertSame($flow->id, $found->id);
        $this->assertTrue($found->relationLoaded('steps'));
    }

    #[Test]
    public function find_with_steps_or_fail_aborts_404_for_nonexistent_flow(): void
    {
        $user = $this->makePetugasDesaActor();
        $this->expectException(NotFoundHttpException::class);

        $this->service->findWithStepsOrFail(99999, $user);
    }

    #[Test]
    public function create_persists_new_flow_via_repository(): void
    {
        $user = $this->makePetugasDesaActor();
        $category = $this->makeCategory('approval_normal');

        $flow = $this->service->create([
            'category_id' => $category->id,
            'name' => 'Flow Baru Dari Service',
            'is_active' => true,
        ], $user);

        $this->assertNotNull($flow->id);
        $this->assertDatabaseHas('approval_flows', [
            'id' => $flow->id,
            'name' => 'Flow Baru Dari Service',
        ]);
    }

    #[Test]
    public function replace_steps_aborts_404_for_nonexistent_flow(): void
    {
        $user = $this->makePetugasDesaActor();
        $this->expectException(NotFoundHttpException::class);

        $this->service->replaceSteps(99999, [
            ['step_order' => 1, 'approver_position' => 'rt', 'is_final' => true],
        ], $user);
    }

    #[Test]
    public function replace_steps_delegates_replace_all_to_repository_for_existing_flow(): void
    {
        $user = $this->makePetugasDesaActor();
        $category = $this->makeCategory('approval_normal');
        $flow = $this->makeFlow($category, 'Flow Dengan Steps', true, $user->village_id);

        FlowStep::query()->create([
            'flow_id' => $flow->id, 'step_order' => 1,
            'approver_position' => 'rt', 'is_final' => true,
        ]);

        $newSteps = $this->service->replaceSteps($flow->id, [
            ['step_order' => 1, 'approver_position' => 'rt', 'is_final' => false],
            ['step_order' => 2, 'approver_position' => 'kepala_desa', 'is_final' => true],
        ], $user);

        $this->assertCount(2, $newSteps);
        $this->assertDatabaseCount('flow_steps', 2);
        $this->assertDatabaseHas('flow_steps', [
            'flow_id' => $flow->id, 'step_order' => 2, 'approver_position' => 'kepala_desa',
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

    private function makeFlow(LetterCategory $category, string $name, bool $isActive = true, ?string $villageId = null): ApprovalFlow
    {
        return ApprovalFlow::query()->create([
            'village_id' => $villageId ?? $this->makePetugasDesaActor()->village_id,
            'category_id' => $category->id,
            'name' => $name,
            'description' => null,
            'is_active' => $isActive,
        ]);
    }
}
