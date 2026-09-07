<?php

namespace Tests\Unit;

use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\Village;
use App\Repositories\OfficialRepository;
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
}
