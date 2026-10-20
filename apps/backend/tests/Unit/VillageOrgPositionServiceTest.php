<?php

namespace Tests\Unit;

use App\Models\User;
use App\Models\Village;
use App\Models\VillageOrgPosition;
use App\Repositories\VillageOrgPositionRepository;
use App\Services\VillageOrgPositionService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VillageOrgPositionServiceTest extends TestCase
{
    use RefreshDatabase;

    private VillageOrgPositionService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new VillageOrgPositionService(new VillageOrgPositionRepository);
    }

    public function test_list_creates_slots_for_requested_org_type_only(): void
    {
        $village = Village::factory()->create();
        $user = User::factory()->create(['village_id' => $village->id]);

        $result = $this->service->list($user, 'lpm');

        $this->assertSame(['ketua', 'wakil_ketua', 'anggota'], $result->pluck('slot')->all());
        $this->assertSame(3, VillageOrgPosition::query()->count());
    }

    public function test_list_without_org_type_creates_slots_for_every_organization(): void
    {
        $village = Village::factory()->create();
        $user = User::factory()->create(['village_id' => $village->id]);

        $result = $this->service->list($user);

        $this->assertCount(count(VillageOrgPosition::ORG_TYPES) * 3, $result);
    }

    public function test_list_scopes_to_user_village(): void
    {
        $village = Village::factory()->create();
        $otherVillage = Village::factory()->create();
        $user = User::factory()->create(['village_id' => $village->id]);

        VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id, 'org_type' => 'bpd']);

        $result = $this->service->list($user, 'bpd');

        $this->assertCount(3, $result);
        $this->assertTrue($result->every(fn ($position) => $position->village_id === $village->id));
    }

    public function test_find_returns_position_belonging_to_user_village(): void
    {
        $village = Village::factory()->create();
        $user = User::factory()->create(['village_id' => $village->id]);
        $position = VillageOrgPosition::factory()->create(['village_id' => $village->id]);

        $found = $this->service->find($user, $position->id);

        $this->assertSame($position->id, $found->id);
    }

    /**
     * Guard multi-tenant (EV5-10-S2): Petugas Desa tidak boleh bisa
     * "menebak" ID jabatan milik desa lain lewat GET /village-org-positions/{id}.
     */
    public function test_find_throws_when_position_belongs_to_other_village(): void
    {
        $village = Village::factory()->create();
        $otherVillage = Village::factory()->create();
        $user = User::factory()->create(['village_id' => $village->id]);
        $position = VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id]);

        $this->expectException(ModelNotFoundException::class);

        $this->service->find($user, $position->id);
    }
}
