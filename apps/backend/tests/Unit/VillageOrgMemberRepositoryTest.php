<?php

namespace Tests\Unit;

use App\Models\VillageOrgMember;
use App\Models\VillageOrgPosition;
use App\Repositories\VillageOrgMemberRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VillageOrgMemberRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private VillageOrgMemberRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new VillageOrgMemberRepository;
    }

    public function test_active_for_position_returns_only_active_members(): void
    {
        $position = VillageOrgPosition::factory()->create();
        VillageOrgMember::factory()->create(['position_id' => $position->id, 'is_active' => true]);
        VillageOrgMember::factory()->inactive()->create(['position_id' => $position->id]);

        $result = $this->repository->activeForPosition($position->id);

        $this->assertCount(1, $result);
    }

    public function test_create_persists_member(): void
    {
        $position = VillageOrgPosition::factory()->create();

        $member = $this->repository->create([
            'position_id' => $position->id,
            'member_name' => 'Budi Santoso',
            'started_at' => '2024-01-01',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('village_org_members', [
            'id' => $member->id,
            'member_name' => 'Budi Santoso',
        ]);
    }

    public function test_end_membership_sets_ended_at_and_inactive(): void
    {
        $member = VillageOrgMember::factory()->create(['is_active' => true, 'ended_at' => null]);

        $updated = $this->repository->endMembership($member, '2026-08-01');

        $this->assertFalse($updated->is_active);
        $this->assertSame('2026-08-01', $updated->ended_at->format('Y-m-d'));
    }

    public function test_update_persists_changes(): void
    {
        $member = VillageOrgMember::factory()->create(['member_name' => 'Lama']);

        $updated = $this->repository->update($member, ['member_name' => 'Baru']);

        $this->assertSame('Baru', $updated->member_name);
    }

    public function test_delete_removes_member(): void
    {
        $member = VillageOrgMember::factory()->create();

        $this->repository->delete($member);

        $this->assertDatabaseMissing('village_org_members', ['id' => $member->id]);
    }

    public function test_belongs_to_position_true_and_false(): void
    {
        $positionA = VillageOrgPosition::factory()->create();
        $positionB = VillageOrgPosition::factory()->create();
        $member = VillageOrgMember::factory()->create(['position_id' => $positionA->id]);

        $this->assertTrue($this->repository->belongsToPosition($member, $positionA));
        $this->assertFalse($this->repository->belongsToPosition($member, $positionB));
    }
}
