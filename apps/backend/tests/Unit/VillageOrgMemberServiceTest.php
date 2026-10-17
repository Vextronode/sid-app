<?php

namespace Tests\Unit;

use App\Models\User;
use App\Models\Village;
use App\Models\VillageOrgMember;
use App\Models\VillageOrgPosition;
use App\Repositories\VillageOrgMemberRepository;
use App\Repositories\VillageOrgPositionRepository;
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

        $this->service = new VillageOrgMemberService(
            new VillageOrgMemberRepository,
            new VillageOrgPositionRepository,
        );
    }

    private function stafSidFor(VillageOrgPosition $position): User
    {
        return User::factory()->create(['village_id' => $position->village_id]);
    }

    public function test_add_first_member_to_single_occupant_position(): void
    {
        $position = VillageOrgPosition::factory()->create(['is_single_occupant' => true]);
        $user = $this->stafSidFor($position);

        $member = $this->service->addOrRotate($user, $position, [
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

    public function test_adding_member_to_single_occupant_position_rotates_previous_member(): void
    {
        $position = VillageOrgPosition::factory()->create(['is_single_occupant' => true]);
        $user = $this->stafSidFor($position);
        $oldMember = VillageOrgMember::factory()->create([
            'position_id' => $position->id,
            'is_active' => true,
            'ended_at' => null,
        ]);

        $newMember = $this->service->addOrRotate($user, $position, [
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
        $user = $this->stafSidFor($position);
        $existingMember = VillageOrgMember::factory()->create([
            'position_id' => $position->id,
            'is_active' => true,
        ]);

        $this->service->addOrRotate($user, $position, [
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
        $user = $this->stafSidFor($position);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Fitur rotasi untuk organisasi ini belum diaktifkan, menunggu konfirmasi desa.');

        $this->service->addOrRotate($user, $position, [
            'member_name' => 'Budi Santoso',
            'started_at' => '2024-01-01',
        ]);
    }

    /**
     * Guard multi-tenant (EV5-10-S2): Petugas Desa desa lain tidak boleh
     * bisa menambah anggota ke jabatan yang bukan miliknya, walau
     * position_id-nya valid dan aktif.
     */
    public function test_add_member_is_blocked_when_position_belongs_to_other_village(): void
    {
        $village = Village::factory()->create();
        $position = VillageOrgPosition::factory()->create();
        $user = User::factory()->create(['village_id' => $village->id]);

        $this->assertNotSame($village->id, $position->village_id);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Jabatan organisasi tidak ditemukan.');

        $this->service->addOrRotate($user, $position, [
            'member_name' => 'Budi Santoso',
            'started_at' => '2024-01-01',
        ]);
    }

    public function test_update_persists_changes(): void
    {
        $position = VillageOrgPosition::factory()->create();
        $user = $this->stafSidFor($position);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id, 'member_name' => 'Lama']);

        $updated = $this->service->update($user, $position, $member->id, ['member_name' => 'Baru']);

        $this->assertSame('Baru', $updated->member_name);
    }

    public function test_delete_removes_member(): void
    {
        $position = VillageOrgPosition::factory()->multiOccupant()->create();
        $user = $this->stafSidFor($position);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id]);

        $this->service->delete($user, $position, $member->id);

        $this->assertDatabaseMissing('village_org_members', ['id' => $member->id]);
    }

    public function test_update_throws_when_member_does_not_belong_to_position(): void
    {
        $position = VillageOrgPosition::factory()->create();
        $user = $this->stafSidFor($position);
        $otherPosition = VillageOrgPosition::factory()->wakilKetua()->create([
            'village_id' => $position->village_id,
            'org_type' => $position->org_type,
        ]);
        $member = VillageOrgMember::factory()->create(['position_id' => $otherPosition->id]);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Anggota organisasi tidak ditemukan pada jabatan ini.');

        $this->service->update($user, $position, $member->id, ['member_name' => 'Baru']);
    }

    public function test_delete_throws_when_member_does_not_belong_to_position(): void
    {
        $position = VillageOrgPosition::factory()->create();
        $user = $this->stafSidFor($position);
        $otherPosition = VillageOrgPosition::factory()->wakilKetua()->create([
            'village_id' => $position->village_id,
            'org_type' => $position->org_type,
        ]);
        $member = VillageOrgMember::factory()->create(['position_id' => $otherPosition->id]);

        $this->expectException(HttpException::class);

        $this->service->delete($user, $position, $member->id);
    }

    public function test_update_throws_when_position_belongs_to_other_village(): void
    {
        $village = Village::factory()->create();
        $position = VillageOrgPosition::factory()->create();
        $user = User::factory()->create(['village_id' => $village->id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id]);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Jabatan organisasi tidak ditemukan.');

        $this->service->update($user, $position, $member->id, ['member_name' => 'Baru']);
    }

    public function test_delete_of_active_ketua_is_rejected_but_history_can_be_deleted(): void
    {
        $position = VillageOrgPosition::factory()->create();
        $user = $this->stafSidFor($position);
        $active = VillageOrgMember::factory()->create(['position_id' => $position->id, 'is_active' => true]);
        $history = VillageOrgMember::factory()->inactive()->create(['position_id' => $position->id]);

        $this->service->delete($user, $position, $history->id);
        $this->assertDatabaseMissing('village_org_members', ['id' => $history->id]);

        $this->expectException(HttpException::class);
        $this->service->delete($user, $position, $active->id);
    }

    public function test_promoting_anggota_to_ketua_ends_anggota_membership_and_copies_data(): void
    {
        [$user, $ketua, , $anggota] = $this->organization();
        $member = VillageOrgMember::factory()->create([
            'position_id' => $anggota->id,
            'member_name' => 'Siti Aminah',
            'phone_wa' => '6281234',
            'is_active' => true,
            'ended_at' => null,
        ]);

        $promoted = $this->service->addOrRotate($user, $ketua, [
            'from_member_id' => $member->id,
            'started_at' => '2026-10-01',
        ]);

        $this->assertSame('Siti Aminah', $promoted->member_name);
        $this->assertSame('6281234', $promoted->phone_wa);
        $this->assertSame($ketua->id, $promoted->position_id);
        $this->assertFalse($member->fresh()->is_active);
        $this->assertSame('2026-10-01', $member->fresh()->ended_at->format('Y-m-d'));
    }

    public function test_swapping_wakil_to_ketua_can_move_previous_ketua_to_anggota(): void
    {
        [$user, $ketua, $wakil, $anggota] = $this->organization();
        $oldKetua = VillageOrgMember::factory()->create([
            'position_id' => $ketua->id,
            'member_name' => 'Ketua Lama',
            'is_active' => true,
            'ended_at' => null,
        ]);
        $oldWakil = VillageOrgMember::factory()->create([
            'position_id' => $wakil->id,
            'member_name' => 'Wakil Lama',
            'is_active' => true,
            'ended_at' => null,
        ]);

        $this->service->addOrRotate($user, $ketua, [
            'from_member_id' => $oldWakil->id,
            'previous_holder' => 'to_member',
            'started_at' => '2026-10-01',
        ]);

        $this->assertSame(['Wakil Lama'], $ketua->activeMembers()->pluck('member_name')->all());
        $this->assertSame(0, $wakil->activeMembers()->count());
        $this->assertSame(['Ketua Lama'], $anggota->activeMembers()->pluck('member_name')->all());
        $this->assertFalse($oldKetua->fresh()->is_active);
    }

    public function test_promotion_source_from_other_organization_is_rejected(): void
    {
        [$user, $ketua] = $this->organization('bpd');
        $pkkAnggota = VillageOrgPosition::factory()->multiOccupant()->create([
            'village_id' => $user->village_id,
            'org_type' => 'pkk',
        ]);
        $member = VillageOrgMember::factory()->create(['position_id' => $pkkAnggota->id, 'is_active' => true]);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Anggota yang dipilih harus anggota aktif organisasi ini dari jabatan lain.');

        $this->service->addOrRotate($user, $ketua, [
            'from_member_id' => $member->id,
            'started_at' => '2026-10-01',
        ]);
    }

    public function test_ending_ketua_empties_slot(): void
    {
        [$user, $ketua, , $anggota] = $this->organization();
        $holder = VillageOrgMember::factory()->create([
            'position_id' => $ketua->id,
            'is_active' => true,
            'ended_at' => null,
        ]);

        $this->service->end($user, $ketua, $holder->id, ['ended_at' => '2026-10-01']);

        $this->assertFalse($holder->fresh()->is_active);
        $this->assertSame(0, $ketua->activeMembers()->count());
        $this->assertSame(0, $anggota->activeMembers()->count());
    }

    public function test_ending_ketua_with_to_member_demotes_to_anggota(): void
    {
        [$user, $ketua, , $anggota] = $this->organization();
        $holder = VillageOrgMember::factory()->create([
            'position_id' => $ketua->id,
            'member_name' => 'Ketua Turun',
            'is_active' => true,
            'ended_at' => null,
        ]);

        $this->service->end($user, $ketua, $holder->id, ['to_member' => true]);

        $this->assertSame(['Ketua Turun'], $anggota->activeMembers()->pluck('member_name')->all());
    }

    public function test_ending_anggota_is_rejected(): void
    {
        [$user, , , $anggota] = $this->organization();
        $member = VillageOrgMember::factory()->create(['position_id' => $anggota->id, 'is_active' => true]);

        $this->expectException(HttpException::class);

        $this->service->end($user, $anggota, $member->id, []);
    }

    /**
     * @return array{0: User, 1: VillageOrgPosition, 2: VillageOrgPosition, 3: VillageOrgPosition}
     */
    private function organization(string $orgType = 'bpd'): array
    {
        $village = Village::factory()->create();
        $user = User::factory()->create(['village_id' => $village->id]);
        (new VillageOrgPositionRepository)->ensureSlots($village->id, $orgType);

        $slots = VillageOrgPosition::query()
            ->where('village_id', $village->id)
            ->where('org_type', $orgType)
            ->get()
            ->keyBy('slot');

        return [$user, $slots['ketua'], $slots['wakil_ketua'], $slots['anggota']];
    }
}
