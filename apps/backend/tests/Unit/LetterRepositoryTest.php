<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\Rt;
use App\Models\Rw;
use App\Repositories\LetterRepository;
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
}
