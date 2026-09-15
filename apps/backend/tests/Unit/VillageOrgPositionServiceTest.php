<?php

namespace Tests\Unit;

use App\Models\User;
use App\Models\Village;
use App\Models\VillageOrgPosition;
use App\Repositories\VillageOrgPositionRepository;
use App\Services\VillageOrgPositionService;
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

    public function test_create_sets_village_id_from_user_and_defaults(): void
    {
        $village = Village::factory()->create();
        $user = User::factory()->create(['village_id' => $village->id]);

        $position = $this->service->create($user, [
            'org_type' => 'bpd',
            'position_label' => 'Ketua BPD',
        ]);

        $this->assertSame($village->id, $position->village_id);
        $this->assertTrue($position->is_single_occupant);
        $this->assertTrue($position->is_active);
        $this->assertSame(0, $position->sort_order);
    }

    public function test_create_respects_explicit_optional_fields(): void
    {
        $village = Village::factory()->create();
        $user = User::factory()->create(['village_id' => $village->id]);

        $position = $this->service->create($user, [
            'org_type' => 'bpd',
            'position_label' => 'Anggota BPD',
            'is_single_occupant' => false,
            'sort_order' => 5,
            'is_active' => false,
        ]);

        $this->assertFalse($position->is_single_occupant);
        $this->assertSame(5, $position->sort_order);
        $this->assertFalse($position->is_active);
    }

    public function test_list_scopes_to_user_village(): void
    {
        $village = Village::factory()->create();
        $otherVillage = Village::factory()->create();
        $user = User::factory()->create(['village_id' => $village->id]);

        VillageOrgPosition::factory()->create(['village_id' => $village->id]);
        VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id]);

        $result = $this->service->list($user);

        $this->assertCount(1, $result);
    }

    public function test_update_persists_changes(): void
    {
        $position = VillageOrgPosition::factory()->create(['position_label' => 'Lama']);

        $updated = $this->service->update($position->id, ['position_label' => 'Baru']);

        $this->assertSame('Baru', $updated->position_label);
    }

    public function test_delete_removes_position(): void
    {
        $position = VillageOrgPosition::factory()->create();

        $this->service->delete($position->id);

        $this->assertDatabaseMissing('village_org_positions', ['id' => $position->id]);
    }
}
