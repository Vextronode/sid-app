<?php

namespace Tests\Unit;

use App\Models\ApprovalFlow;
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
 *  - findWithStepsOrFail() mengembalikan flow beserta steps.
 *  - findWithStepsOrFail() melempar 404 untuk flow yang tidak ada.
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
    public function find_with_steps_or_fail_returns_flow_with_steps(): void
    {
        $user = $this->makeStafSidActor();
        $flow = $this->makeFlow('Flow Detail', true, $user->village_id);

        $found = $this->service->findWithStepsOrFail($flow->id, $user);

        $this->assertSame($flow->id, $found->id);
        $this->assertTrue($found->relationLoaded('steps'));
    }

    #[Test]
    public function find_with_steps_or_fail_aborts_404_for_nonexistent_flow(): void
    {
        $user = $this->makeStafSidActor();
        $this->expectException(NotFoundHttpException::class);

        $this->service->findWithStepsOrFail(99999, $user);
    }

    private function makeFlow(string $name, bool $isActive = true, ?string $villageId = null): ApprovalFlow
    {
        return ApprovalFlow::query()->create([
            'village_id' => $villageId ?? $this->makeStafSidActor()->village_id,
            'name' => $name,
            'description' => null,
            'is_active' => $isActive,
        ]);
    }

    #[Test]
    public function list_returns_only_active_flows(): void
    {
        $user = $this->makeStafSidActor();
        $this->makeFlow('Flow Aktif', true, $user->village_id);
        $this->makeFlow('Flow Nonaktif', false, $user->village_id);

        $result = $this->service->list($user);

        $this->assertCount(1, $result);
        $this->assertSame('Flow Aktif', $result->first()->name);
    }
}
