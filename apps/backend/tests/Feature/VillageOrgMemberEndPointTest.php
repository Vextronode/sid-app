<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Village;
use App\Models\VillageOrgMember;
use App\Models\VillageOrgPosition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class VillageOrgMemberEndpointTest extends TestCase
{
    use RefreshDatabase;

    private function petugasDesa(): User
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);

        return User::factory()->create([
            'village_id' => $village->id,
            'role' => 'petugas_desa',
        ]);
    }

    #[Test]
    public function guest_cannot_add_member(): void
    {
        $position = VillageOrgPosition::factory()->create();

        $response = $this->postJson("/api/village-org-positions/{$position->id}/members", [
            'member_name' => 'Budi Santoso',
            'started_at' => '2024-01-01',
        ]);

        $response->assertStatus(401);
    }

    #[Test]
    public function non_petugas_desa_cannot_add_member(): void
    {
        $user = User::factory()->create(['role' => 'warga']);
        $position = VillageOrgPosition::factory()->create();

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'member_name' => 'Budi Santoso',
            'started_at' => '2024-01-01',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function petugas_desa_can_add_first_member(): void
    {
        $user = $this->petugasDesa();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'member_name' => 'Budi Santoso',
            'phone_wa' => '6281111222333',
            'started_at' => '2024-01-01',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.member_name', 'Budi Santoso')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.position_id', $position->id);
    }

    #[Test]
    public function adding_member_to_single_occupant_position_rotates_previous_active_member(): void
    {
        $user = $this->petugasDesa();
        $position = VillageOrgPosition::factory()->create([
            'village_id' => $user->village_id,
            'is_single_occupant' => true,
        ]);
        $oldMember = VillageOrgMember::factory()->create([
            'position_id' => $position->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'member_name' => 'Pengganti Baru',
            'started_at' => '2026-08-01',
        ]);

        $response->assertCreated()->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('village_org_members', [
            'id' => $oldMember->id,
            'is_active' => false,
        ]);
    }

    #[Test]
    public function adding_member_to_multi_occupant_position_keeps_previous_member_active(): void
    {
        $user = $this->petugasDesa();
        $position = VillageOrgPosition::factory()->create([
            'village_id' => $user->village_id,
            'is_single_occupant' => false,
        ]);
        $existingMember = VillageOrgMember::factory()->create([
            'position_id' => $position->id,
            'is_active' => true,
        ]);

        $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'member_name' => 'Anggota Kedua',
            'started_at' => '2026-08-01',
        ])->assertCreated();

        $this->assertDatabaseHas('village_org_members', [
            'id' => $existingMember->id,
            'is_active' => true,
        ]);
    }

    #[Test]
    public function adding_member_is_forbidden_when_position_feature_not_active(): void
    {
        $user = $this->petugasDesa();
        $position = VillageOrgPosition::factory()->inactive()->create(['village_id' => $user->village_id]);

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'member_name' => 'Budi Santoso',
            'started_at' => '2024-01-01',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Fitur rotasi untuk organisasi ini belum diaktifkan, menunggu konfirmasi desa.');
    }

    #[Test]
    public function adding_member_without_required_fields_fails_validation(): void
    {
        $user = $this->petugasDesa();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['member_name', 'started_at']);
    }

    #[Test]
    public function petugas_desa_can_update_member(): void
    {
        $user = $this->petugasDesa();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id, 'member_name' => 'Lama']);

        $response = $this->actingAs($user)->patchJson(
            "/api/village-org-positions/{$position->id}/members/{$member->id}",
            ['member_name' => 'Baru']
        );

        $response->assertOk()->assertJsonPath('data.member_name', 'Baru');
    }

    #[Test]
    public function petugas_desa_can_delete_member(): void
    {
        $user = $this->petugasDesa();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id]);

        $response = $this->actingAs($user)->deleteJson(
            "/api/village-org-positions/{$position->id}/members/{$member->id}"
        );

        $response->assertOk()->assertJsonPath('message', 'Anggota organisasi berhasil dihapus');
        $this->assertDatabaseMissing('village_org_members', ['id' => $member->id]);
    }

    #[Test]
    public function updating_member_via_mismatched_position_url_returns_not_found(): void
    {
        $user = $this->petugasDesa();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);
        $otherPosition = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $otherPosition->id]);

        $response = $this->actingAs($user)->patchJson(
            "/api/village-org-positions/{$position->id}/members/{$member->id}",
            ['member_name' => 'Baru']
        );

        $response->assertStatus(404);
    }

    /**
     * Guard multi-tenant (EV5-10-S2): Petugas Desa satu desa tidak boleh
     * bisa menambah/mengubah/menghapus anggota jabatan milik desa lain,
     * walau position_id-nya valid.
     */
    #[Test]
    public function adding_member_to_position_of_other_village_returns_404(): void
    {
        $user = $this->petugasDesa();
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL5']);
        $position = VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id]);

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'member_name' => 'Budi Santoso',
            'started_at' => '2024-01-01',
        ]);

        $response->assertStatus(404)
            ->assertJsonPath('message', 'Jabatan organisasi tidak ditemukan.');
    }

    #[Test]
    public function updating_member_of_position_belonging_to_other_village_returns_404(): void
    {
        $user = $this->petugasDesa();
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL6']);
        $position = VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id]);

        $response = $this->actingAs($user)->patchJson(
            "/api/village-org-positions/{$position->id}/members/{$member->id}",
            ['member_name' => 'Baru']
        );

        $response->assertStatus(404);
    }

    #[Test]
    public function deleting_member_of_position_belonging_to_other_village_returns_404(): void
    {
        $user = $this->petugasDesa();
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL7']);
        $position = VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id]);

        $response = $this->actingAs($user)->deleteJson(
            "/api/village-org-positions/{$position->id}/members/{$member->id}"
        );

        $response->assertStatus(404);
        $this->assertDatabaseHas('village_org_members', ['id' => $member->id]);
    }
}
