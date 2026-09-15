<?php

namespace Tests\Unit;

use App\Models\VillageOrgMember;
use App\Models\VillageOrgPosition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class VillageOrgModelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_position_boolean_and_integer_casts(): void
    {
        $position = VillageOrgPosition::factory()->create([
            'is_single_occupant' => 1,
            'is_active' => 1,
            'sort_order' => '3',
        ]);

        $fresh = $position->fresh();

        $this->assertIsBool($fresh->is_single_occupant);
        $this->assertIsBool($fresh->is_active);
        $this->assertIsInt($fresh->sort_order);
    }

    public function test_member_date_casts(): void
    {
        $member = VillageOrgMember::factory()->create([
            'started_at' => '2024-01-01',
            'ended_at' => '2026-01-01',
        ]);

        $fresh = $member->fresh();

        $this->assertInstanceOf(Carbon::class, $fresh->started_at);
        $this->assertInstanceOf(Carbon::class, $fresh->ended_at);
    }

    public function test_position_members_relation_returns_related_members(): void
    {
        $position = VillageOrgPosition::factory()->create();
        VillageOrgMember::factory()->count(2)->create(['position_id' => $position->id]);

        $this->assertCount(2, $position->members);
    }

    public function test_position_active_members_excludes_inactive(): void
    {
        $position = VillageOrgPosition::factory()->create();
        VillageOrgMember::factory()->create(['position_id' => $position->id, 'is_active' => true]);
        VillageOrgMember::factory()->inactive()->create(['position_id' => $position->id]);

        $this->assertCount(1, $position->activeMembers);
    }

    public function test_member_position_relation_returns_owning_position(): void
    {
        $position = VillageOrgPosition::factory()->create();
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id]);

        $this->assertInstanceOf(VillageOrgPosition::class, $member->position);
        $this->assertSame($position->id, $member->position->id);
    }
}
