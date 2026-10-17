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

    public function test_ensure_slots_creates_ketua_wakil_and_anggota(): void
    {
        $village = Village::factory()->create();

        $this->repository->ensureSlots($village->id, 'bpd');

        $slots = VillageOrgPosition::query()->orderBy('sort_order')->get();
        $this->assertSame(['ketua', 'wakil_ketua', 'anggota'], $slots->pluck('slot')->all());
        $this->assertSame(['Ketua', 'Wakil Ketua', 'Anggota'], $slots->pluck('position_label')->all());
        $this->assertSame([true, true, false], $slots->pluck('is_single_occupant')->all());
    }

    public function test_ensure_slots_is_idempotent_and_keeps_existing_slot(): void
    {
        $village = Village::factory()->create();
        $ketua = VillageOrgPosition::factory()->create(['village_id' => $village->id, 'org_type' => 'pkk']);

        $this->repository->ensureSlots($village->id, 'pkk');
        $this->repository->ensureSlots($village->id, 'pkk');

        $this->assertSame(3, VillageOrgPosition::query()->count());
        $this->assertDatabaseHas('village_org_positions', ['id' => $ketua->id, 'slot' => 'ketua']);
    }

    public function test_find_slot_creates_missing_slots(): void
    {
        $village = Village::factory()->create();

        $anggota = $this->repository->findSlot($village->id, 'lpm', 'anggota');

        $this->assertSame('anggota', $anggota->slot);
        $this->assertFalse($anggota->is_single_occupant);
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

        VillageOrgPosition::factory()->multiOccupant()->create(['village_id' => $village->id, 'org_type' => 'bpd']);
        VillageOrgPosition::factory()->create(['village_id' => $village->id, 'org_type' => 'bpd']);

        $result = $this->repository->allForVillage($village->id);

        $this->assertSame('ketua', $result->first()->slot);
    }

    public function test_find_by_id_or_fail_throws_when_not_found(): void
    {
        $this->expectException(ModelNotFoundException::class);

        $this->repository->findByIdOrFail(999);
    }
}
