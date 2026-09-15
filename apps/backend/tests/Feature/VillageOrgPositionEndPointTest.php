<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Village;
use App\Models\VillageOrgMember;
use App\Models\VillageOrgPosition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class VillageOrgPositionEndpointTest extends TestCase
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
    public function guest_cannot_list_positions(): void
    {
        $response = $this->getJson('/api/village-org-positions');

        $response->assertStatus(401);
    }

    #[Test]
    public function non_petugas_desa_cannot_list_positions(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $response = $this->actingAs($user)->getJson('/api/village-org-positions');

        $response->assertStatus(403);
    }

    #[Test]
    public function petugas_desa_can_list_positions_scoped_to_own_village(): void
    {
        $user = $this->petugasDesa();
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL']);

        VillageOrgPosition::factory()->create(['village_id' => $user->village_id, 'org_type' => 'bpd']);
        VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id, 'org_type' => 'bpd']);

        $response = $this->actingAs($user)->getJson('/api/village-org-positions');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function petugas_desa_can_filter_positions_by_org_type(): void
    {
        $user = $this->petugasDesa();

        VillageOrgPosition::factory()->create(['village_id' => $user->village_id, 'org_type' => 'bpd']);
        VillageOrgPosition::factory()->create(['village_id' => $user->village_id, 'org_type' => 'pkk']);

        $response = $this->actingAs($user)->getJson('/api/village-org-positions?org_type=pkk');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('pkk', $response->json('data.0.org_type'));
    }

    #[Test]
    public function petugas_desa_can_create_position_with_defaults(): void
    {
        $user = $this->petugasDesa();

        $response = $this->actingAs($user)->postJson('/api/village-org-positions', [
            'org_type' => 'bpd',
            'position_label' => 'Ketua BPD',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.org_type', 'bpd')
            ->assertJsonPath('data.position_label', 'Ketua BPD')
            ->assertJsonPath('data.is_single_occupant', true)
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.village_id', $user->village_id);
    }

    #[Test]
    public function non_petugas_desa_cannot_create_position(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $response = $this->actingAs($user)->postJson('/api/village-org-positions', [
            'org_type' => 'bpd',
            'position_label' => 'Ketua BPD',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function creating_position_without_required_fields_fails_validation(): void
    {
        $user = $this->petugasDesa();

        $response = $this->actingAs($user)->postJson('/api/village-org-positions', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['org_type', 'position_label']);
    }

    #[Test]
    public function creating_position_with_invalid_org_type_fails_validation(): void
    {
        $user = $this->petugasDesa();

        $response = $this->actingAs($user)->postJson('/api/village-org-positions', [
            'org_type' => 'tidak_valid',
            'position_label' => 'Ketua Sesuatu',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['org_type']);
    }

    #[Test]
    public function petugas_desa_can_update_position(): void
    {
        $user = $this->petugasDesa();
        $position = VillageOrgPosition::factory()->create([
            'village_id' => $user->village_id,
            'position_label' => 'Ketua Lama',
        ]);

        $response = $this->actingAs($user)->patchJson("/api/village-org-positions/{$position->id}", [
            'position_label' => 'Ketua Baru',
            'is_active' => false,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.position_label', 'Ketua Baru')
            ->assertJsonPath('data.is_active', false);
    }

    #[Test]
    public function petugas_desa_can_delete_position_permanently(): void
    {
        $user = $this->petugasDesa();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);

        $response = $this->actingAs($user)->deleteJson("/api/village-org-positions/{$position->id}");

        $response->assertOk()->assertJsonPath('message', 'Jabatan organisasi berhasil dihapus');

        $this->assertDatabaseMissing('village_org_positions', ['id' => $position->id]);
    }

    #[Test]
    public function petugas_desa_can_show_position_detail_with_all_members(): void
    {
        $user = $this->petugasDesa();
        $position = VillageOrgPosition::factory()->create([
            'village_id' => $user->village_id,
            'position_label' => 'Ketua BPD',
        ]);
        VillageOrgMember::factory()->create(['position_id' => $position->id, 'is_active' => true]);
        VillageOrgMember::factory()->inactive()->create(['position_id' => $position->id]);

        $response = $this->actingAs($user)->getJson("/api/village-org-positions/{$position->id}");

        $response->assertOk()
            ->assertJsonPath('data.position_label', 'Ketua BPD');
        $this->assertCount(2, $response->json('data.members'));
    }

    #[Test]
    public function showing_nonexistent_position_returns_404(): void
    {
        $user = $this->petugasDesa();

        $response = $this->actingAs($user)->getJson('/api/village-org-positions/99999');

        $response->assertStatus(404);
    }

    /**
     * Guard multi-tenant (EV5-10-S2): Petugas Desa satu desa tidak boleh
     * bisa lihat/edit/hapus jabatan milik desa lain hanya lewat ID.
     */
    #[Test]
    public function petugas_desa_cannot_show_position_belonging_to_other_village(): void
    {
        $user = $this->petugasDesa();
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL2']);
        $position = VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id]);

        $response = $this->actingAs($user)->getJson("/api/village-org-positions/{$position->id}");

        $response->assertStatus(404);
    }

    #[Test]
    public function petugas_desa_cannot_update_position_belonging_to_other_village(): void
    {
        $user = $this->petugasDesa();
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL3']);
        $position = VillageOrgPosition::factory()->create([
            'village_id' => $otherVillage->id,
            'position_label' => 'Punya Desa Lain',
        ]);

        $response = $this->actingAs($user)->patchJson("/api/village-org-positions/{$position->id}", [
            'position_label' => 'Coba Dirubah',
        ]);

        $response->assertStatus(404);
        $this->assertDatabaseHas('village_org_positions', [
            'id' => $position->id,
            'position_label' => 'Punya Desa Lain',
        ]);
    }

    #[Test]
    public function petugas_desa_cannot_delete_position_belonging_to_other_village(): void
    {
        $user = $this->petugasDesa();
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL4']);
        $position = VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id]);

        $response = $this->actingAs($user)->deleteJson("/api/village-org-positions/{$position->id}");

        $response->assertStatus(404);
        $this->assertDatabaseHas('village_org_positions', ['id' => $position->id]);
    }
}
