<?php

namespace Tests\Unit;

use App\Models\VillageOrgMember;
use App\Models\VillageOrgPosition;
use App\Repositories\VillageOrgMemberRepository;
use App\Services\VillageOrgMemberService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class VillageOrgMemberServiceTest extends TestCase
{
    use RefreshDatabase;

    private VillageOrgMemberService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new VillageOrgMemberService(new VillageOrgMemberRepository);
    }

    public function test_add_first_member_to_single_occupant_position(): void
    {
        $position = VillageOrgPosition::factory()->create(['is_single_occupant' => true]);

        $member = $this->service->addOrRotate($position, [
            'member_name' => 'Budi Santoso',
            'started_at' => '2024-01-01',
        ]);

        $this->assertSame('Budi Santoso', $member->member_name);
        $this->assertTrue($member->is_active);
        $this->assertDatabaseHas('village_org_members', [
            'id' => $member->id,
            'position_id' => $position->id,
        ]);
    }

    /**
     * UC-23 / api_spec addVillageOrgMember: is_single_occupant=true dan
     * sudah ada anggota aktif -> otomatis rotasi (anggota lama diakhiri,
     * anggota baru ditambahkan).
     */
    public function test_adding_member_to_single_occupant_position_rotates_previous_member(): void
    {
        $position = VillageOrgPosition::factory()->create(['is_single_occupant' => true]);
        $oldMember = VillageOrgMember::factory()->create([
            'position_id' => $position->id,
            'is_active' => true,
            'ended_at' => null,
        ]);

        $newMember = $this->service->addOrRotate($position, [
            'member_name' => 'Pengganti Baru',
            'started_at' => '2026-08-01',
        ]);

        $oldMember->refresh();
        $this->assertFalse($oldMember->is_active);
        $this->assertNotNull($oldMember->ended_at);

        $this->assertTrue($newMember->is_active);
        $this->assertSame('Pengganti Baru', $newMember->member_name);

        $activeMembers = VillageOrgMember::where('position_id', $position->id)
            ->where('is_active', true)
            ->get();
        $this->assertCount(1, $activeMembers);
    }

    /**
     * is_single_occupant=false (misal "Anggota BPD") -> anggota baru
     * ditambahkan tanpa mengakhiri yang lama, boleh banyak aktif sekaligus.
     */
    public function test_adding_member_to_multi_occupant_position_does_not_end_previous_members(): void
    {
        $position = VillageOrgPosition::factory()->multiOccupant()->create();
        $existingMember = VillageOrgMember::factory()->create([
            'position_id' => $position->id,
            'is_active' => true,
        ]);

        $this->service->addOrRotate($position, [
            'member_name' => 'Anggota Kedua',
            'started_at' => '2026-08-01',
        ]);

        $existingMember->refresh();
        $this->assertTrue($existingMember->is_active);

        $activeMembers = VillageOrgMember::where('position_id', $position->id)
            ->where('is_active', true)
            ->get();
        $this->assertCount(2, $activeMembers);
    }

    /**
     * TDD-05 Section 4: fitur rotasi pending konfirmasi desa. Selama
     * position.is_active = false, penambahan/rotasi anggota ditolak.
     */
    public function test_add_member_is_blocked_when_position_feature_not_active(): void
    {
        $position = VillageOrgPosition::factory()->inactive()->create();

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Fitur rotasi untuk organisasi ini belum diaktifkan, menunggu konfirmasi desa.');

        $this->service->addOrRotate($position, [
            'member_name' => 'Budi Santoso',
            'started_at' => '2024-01-01',
        ]);
    }

    public function test_update_persists_changes(): void
    {
        $position = VillageOrgPosition::factory()->create();
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id, 'member_name' => 'Lama']);

        $updated = $this->service->update($position, $member->id, ['member_name' => 'Baru']);

        $this->assertSame('Baru', $updated->member_name);
    }

    public function test_delete_removes_member(): void
    {
        $position = VillageOrgPosition::factory()->create();
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id]);

        $this->service->delete($position, $member->id);

        $this->assertDatabaseMissing('village_org_members', ['id' => $member->id]);
    }

    public function test_update_throws_when_member_does_not_belong_to_position(): void
    {
        $position = VillageOrgPosition::factory()->create();
        $otherPosition = VillageOrgPosition::factory()->create();
        $member = VillageOrgMember::factory()->create(['position_id' => $otherPosition->id]);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Anggota organisasi tidak ditemukan pada jabatan ini.');

        $this->service->update($position, $member->id, ['member_name' => 'Baru']);
    }

    public function test_delete_throws_when_member_does_not_belong_to_position(): void
    {
        $position = VillageOrgPosition::factory()->create();
        $otherPosition = VillageOrgPosition::factory()->create();
        $member = VillageOrgMember::factory()->create(['position_id' => $otherPosition->id]);

        $this->expectException(HttpException::class);

        $this->service->delete($position, $member->id);
    }
}
