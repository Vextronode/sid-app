<?php

namespace Tests\Unit;

use App\Models\Village;
use App\Models\VillageOrgPosition;
use App\Repositories\VillageOrgPositionRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VillageOrgPositionRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private VillageOrgPositionRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new VillageOrgPositionRepository;
    }

    public function test_all_for_village_returns_only_positions_of_that_village(): void
    {
        $village = Village::factory()->create();
        $otherVillage = Village::factory()->create();

        VillageOrgPosition::factory()->create(['village_id' => $village->id, 'org_type' => 'bpd']);
        VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id, 'org_type' => 'bpd']);

        $result = $this->repository->allForVillage($village->id);

        $this->assertCount(1, $result);
        $this->assertSame($village->id, $result->first()->village_id);
    }

    public function test_all_for_village_can_filter_by_org_type(): void
    {
        $village = Village::factory()->create();

        VillageOrgPosition::factory()->create(['village_id' => $village->id, 'org_type' => 'bpd']);
        VillageOrgPosition::factory()->create(['village_id' => $village->id, 'org_type' => 'pkk']);

        $result = $this->repository->allForVillage($village->id, 'pkk');

        $this->assertCount(1, $result);
        $this->assertSame('pkk', $result->first()->org_type);
    }

    public function test_all_for_village_orders_by_org_type_then_sort_order(): void
    {
        $village = Village::factory()->create();

        VillageOrgPosition::factory()->create([
            'village_id' => $village->id,
            'org_type' => 'bpd',
            'sort_order' => 2,
            'position_label' => 'Sekretaris BPD',
        ]);
        VillageOrgPosition::factory()->create([
            'village_id' => $village->id,
            'org_type' => 'bpd',
            'sort_order' => 1,
            'position_label' => 'Ketua BPD',
        ]);

        $result = $this->repository->allForVillage($village->id);

        $this->assertSame('Ketua BPD', $result->first()->position_label);
    }

    public function test_create_persists_position(): void
    {
        $village = Village::factory()->create();

        $position = $this->repository->create([
            'village_id' => $village->id,
            'org_type' => 'bpd',
            'position_label' => 'Ketua BPD',
            'is_single_occupant' => true,
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('village_org_positions', [
            'id' => $position->id,
            'position_label' => 'Ketua BPD',
        ]);
    }

    public function test_update_persists_changes(): void
    {
        $position = VillageOrgPosition::factory()->create(['position_label' => 'Lama']);

        $updated = $this->repository->update($position, ['position_label' => 'Baru']);

        $this->assertSame('Baru', $updated->position_label);
        $this->assertDatabaseHas('village_org_positions', ['id' => $position->id, 'position_label' => 'Baru']);
    }

    public function test_delete_removes_position(): void
    {
        $position = VillageOrgPosition::factory()->create();

        $this->repository->delete($position);

        $this->assertDatabaseMissing('village_org_positions', ['id' => $position->id]);
    }

    public function test_find_by_id_or_fail_throws_when_not_found(): void
    {
        $this->expectException(ModelNotFoundException::class);

        $this->repository->findByIdOrFail(999);
    }
}
