<?php

namespace Tests\Unit;

use App\Models\ApprovalFlow;
use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\Village;
use App\Repositories\LetterRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LetterRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private LetterRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new LetterRepository;
    }

    public function test_create_persists_letter(): void
    {
        $letter = $this->repository->create(Letter::factory()->make()->toArray());

        $this->assertDatabaseHas('letters', ['id' => $letter->id]);
    }

    public function test_find_returns_letter_when_exists(): void
    {
        $letter = Letter::factory()->create();

        $result = $this->repository->find($letter->id);

        $this->assertNotNull($result);
        $this->assertSame($letter->id, $result->id);
    }

    public function test_find_returns_null_when_not_exists(): void
    {
        $result = $this->repository->find(999999);

        $this->assertNull($result);
    }

    public function test_find_or_fail_returns_letter_when_exists(): void
    {
        $letter = Letter::factory()->create();

        $result = $this->repository->findOrFail($letter->id);

        $this->assertSame($letter->id, $result->id);
    }

    public function test_find_or_fail_throws_when_not_exists(): void
    {
        $this->expectException(ModelNotFoundException::class);

        $this->repository->findOrFail(999999);
    }

    public function test_find_with_approval_actor_for_show_eager_loads_relations(): void
    {
        $letter = Letter::factory()->create();

        $found = $this->repository->findWithApprovalActorForShow($letter->id);

        $this->assertTrue($found->relationLoaded('letterType'));
        $this->assertTrue($found->relationLoaded('approvals'));
    }

    public function test_delete_removes_letter(): void
    {
        $letter = Letter::factory()->create();

        $this->repository->delete($letter);

        $this->assertDatabaseMissing('letters', ['id' => $letter->id]);
    }

    public function test_query_by_village_filters_correctly(): void
    {
        $letterA = Letter::factory()->create();
        Letter::factory()->create();

        $result = $this->repository->queryByVillage($letterA->village_id)->get();

        $this->assertCount(1, $result);
    }

    public function test_where_citizen_rt_id_filters_via_relation(): void
    {
        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id]);
        Letter::factory()->create();

        $query = $this->repository->queryForList();
        $result = $this->repository->whereCitizenRtId($query, $rt->id)->get();

        $this->assertCount(1, $result);
        $this->assertSame($letter->id, $result->first()->id);
    }

    public function test_where_citizen_rw_id_filters_via_nested_relation(): void
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id]);
        Letter::factory()->create();

        $query = $this->repository->queryForList();
        $result = $this->repository->whereCitizenRwId($query, $rw->id)->get();

        $this->assertCount(1, $result);
        $this->assertSame($letter->id, $result->first()->id);
    }

    public function test_query_pending_at_flow_step_positions_matches_current_step(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'rt']);
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 2, 'approver_position' => 'kepala_desa']);
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 3, 'approver_position' => 'kasi_pelayanan']);

        $atKadesStep = Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 2,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 3,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $result = $this->repository
            ->queryPendingAtFlowStepPositions(['kepala_desa'], $village->id)
            ->get();

        $this->assertCount(1, $result);
        $this->assertSame($atKadesStep->id, $result->first()->id);
    }

    public function test_query_pending_at_flow_step_positions_excludes_other_village(): void
    {
        $village = Village::factory()->create();
        $otherVillage = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $otherVillage->id]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'kepala_desa']);

        Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'village_id' => $otherVillage->id,
            'citizen_id' => $citizen->id,
        ]);

        $result = $this->repository
            ->queryPendingAtFlowStepPositions(['kepala_desa'], $village->id)
            ->get();

        $this->assertCount(0, $result);
    }

    public function test_query_pending_at_flow_step_positions_accepts_multiple_positions(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);

        $flowA = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flowA->id, 'step_order' => 1, 'approver_position' => 'kepala_desa']);
        $letterA = Letter::factory()->create([
            'flow_id' => $flowA->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $flowB = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flowB->id, 'step_order' => 1, 'approver_position' => 'kaur_tu_umum']);
        $letterB = Letter::factory()->create([
            'flow_id' => $flowB->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $result = $this->repository
            ->queryPendingAtFlowStepPositions(['kepala_desa', 'kaur_tu_umum'], $village->id)
            ->get();

        $this->assertCount(2, $result);
        $this->assertEqualsCanonicalizing(
            [$letterA->id, $letterB->id],
            $result->pluck('id')->all(),
        );
    }
}
