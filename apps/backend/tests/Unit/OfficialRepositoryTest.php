<?php

namespace Tests\Unit;

use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\Village;
use App\Repositories\OfficialRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfficialRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private OfficialRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new OfficialRepository;
    }

    public function test_find_active_rt_by_rt_id_returns_only_active_rt_official(): void
    {
        $rt = Rt::factory()->create();
        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);
        Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => false]);

        $result = $this->repository->findActiveRtByRtId($rt->id);

        $this->assertSame($official->id, $result->id);
    }

    public function test_all_active_rw_by_rw_id_returns_collection(): void
    {
        $rw = Rw::factory()->create();
        Official::factory()->count(2)->create(['position' => 'rw', 'rw_id' => $rw->id, 'is_active' => true]);
        Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id, 'is_active' => false]);

        $result = $this->repository->allActiveRwByRwId($rw->id);

        $this->assertCount(2, $result);
    }

    public function test_find_active_by_position_and_village(): void
    {
        $village = Village::factory()->create();

        $official = Official::factory()->create([
            'position' => 'kasi_pelayanan',
            'village_id' => $village->id,   // bukan angka 1 hardcode
            'is_active' => true,
        ]);

        $result = $this->repository->findActiveByPositionAndVillage('kasi_pelayanan', $village->id);

        $this->assertSame($official->id, $result->id);
    }

    public function test_find_active_village_head(): void
    {
        $official = Official::factory()->create(['position' => 'kepala_desa', 'is_active' => true]);

        $result = $this->repository->findActiveVillageHead();

        $this->assertSame($official->id, $result->id);
    }

    public function test_create_persists_official(): void
    {
        $official = $this->repository->create(Official::factory()->make()->toArray());

        $this->assertDatabaseHas('officials', ['id' => $official->id]);
    }

    public function test_find_returns_official_when_exists(): void
    {
        $official = Official::factory()->create();

        $result = $this->repository->find($official->id);

        $this->assertNotNull($result);
        $this->assertSame($official->id, $result->id);
    }

    public function test_find_returns_null_when_not_exists(): void
    {
        $result = $this->repository->find(999999);

        $this->assertNull($result);
    }

    public function test_find_or_fail_throws_when_not_exists(): void
    {
        $this->expectException(ModelNotFoundException::class);

        $this->repository->findOrFail(999999);
    }

    public function test_find_with_relations_or_fail_eager_loads_relations(): void
    {
        $official = Official::factory()->create();

        $result = $this->repository->findWithRelationsOrFail($official->id);

        $this->assertTrue($result->relationLoaded('citizen'));
        $this->assertTrue($result->relationLoaded('village'));
    }

    public function test_update_persists_changes(): void
    {
        $official = Official::factory()->create(['phone_wa' => '0800']);

        $updated = $this->repository->update($official, ['phone_wa' => '0811']);

        $this->assertSame('0811', $updated->phone_wa);
        $this->assertDatabaseHas('officials', ['id' => $official->id, 'phone_wa' => '0811']);
    }

    public function test_delete_removes_official(): void
    {
        $official = Official::factory()->create();

        $this->repository->delete($official);

        $this->assertDatabaseMissing('officials', ['id' => $official->id]);
    }

    public function test_all_active_by_position_and_rt_returns_matching_active_officials(): void
    {
        $rt = Rt::factory()->create();
        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);

        $result = $this->repository->allActiveByPositionAndRt('rt', $rt->id);

        $this->assertCount(1, $result);
        $this->assertSame($official->id, $result->first()->id);
    }

    public function test_all_active_by_position_and_rt_excludes_inactive(): void
    {
        $rt = Rt::factory()->create();
        Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => false]);

        $result = $this->repository->allActiveByPositionAndRt('rt', $rt->id);

        $this->assertCount(0, $result);
    }

    public function test_all_active_by_position_and_rt_excludes_different_position(): void
    {
        $rt = Rt::factory()->create();
        Official::factory()->create(['position' => 'kadus', 'rt_id' => $rt->id, 'is_active' => true]);

        $result = $this->repository->allActiveByPositionAndRt('rt', $rt->id);

        $this->assertCount(0, $result);
    }

    public function test_all_active_by_position_and_rt_excludes_different_rt(): void
    {
        $rtA = Rt::factory()->create();
        $rtB = Rt::factory()->create();
        Official::factory()->create(['position' => 'rt', 'rt_id' => $rtB->id, 'is_active' => true]);

        $result = $this->repository->allActiveByPositionAndRt('rt', $rtA->id);

        $this->assertCount(0, $result);
    }

    public function test_exists_active_by_position_and_scope_detects_active_conflict(): void
    {
        $rt = Rt::factory()->create();
        Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);

        $result = $this->repository->existsActiveByPositionAndScope('rt', rtId: $rt->id);

        $this->assertTrue($result);
    }

    public function test_exists_active_by_position_and_scope_ignores_inactive(): void
    {
        $rt = Rt::factory()->create();
        Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => false]);

        $result = $this->repository->existsActiveByPositionAndScope('rt', rtId: $rt->id);

        $this->assertFalse($result);
    }

    public function test_exists_active_by_position_and_scope_excludes_given_id(): void
    {
        $rt = Rt::factory()->create();
        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);

        $result = $this->repository->existsActiveByPositionAndScope('rt', rtId: $rt->id, excludeId: $official->id);

        $this->assertFalse($result);
    }
}
