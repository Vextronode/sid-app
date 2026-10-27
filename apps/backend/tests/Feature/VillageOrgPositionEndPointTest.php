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

    private function stafSid(): User
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);

        return User::factory()->create([
            'village_id' => $village->id,
            'role' => 'staf_sid',
        ]);
    }

    #[Test]
    public function guest_cannot_list_positions(): void
    {
        $response = $this->getJson('/api/village-org-positions');

        $response->assertStatus(401);
    }

    #[Test]
    public function non_staf_sid_cannot_list_positions(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $response = $this->actingAs($user)->getJson('/api/village-org-positions');

        $response->assertStatus(403);
    }

    #[Test]
    public function listing_by_org_type_creates_fixed_slots_in_order(): void
    {
        $user = $this->stafSid();

        $response = $this->actingAs($user)->getJson('/api/village-org-positions?org_type=bpd');

        $response->assertOk()
            ->assertJsonPath('data.0.slot', 'ketua')
            ->assertJsonPath('data.0.position_label', 'Ketua')
            ->assertJsonPath('data.0.is_single_occupant', true)
            ->assertJsonPath('data.1.slot', 'wakil_ketua')
            ->assertJsonPath('data.1.is_single_occupant', true)
            ->assertJsonPath('data.2.slot', 'anggota')
            ->assertJsonPath('data.2.is_single_occupant', false);
        $this->assertCount(3, $response->json('data'));
    }

    #[Test]
    public function listing_twice_does_not_duplicate_slots(): void
    {
        $user = $this->stafSid();

        $this->actingAs($user)->getJson('/api/village-org-positions?org_type=pkk')->assertOk();
        $response = $this->actingAs($user)->getJson('/api/village-org-positions?org_type=pkk');

        $this->assertCount(3, $response->json('data'));
        $this->assertSame(3, VillageOrgPosition::query()->where('org_type', 'pkk')->count());
    }

    #[Test]
    public function listing_without_filter_returns_slots_of_every_organization_in_own_village(): void
    {
        $user = $this->stafSid();
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL']);
        VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id, 'org_type' => 'bpd']);

        $response = $this->actingAs($user)->getJson('/api/village-org-positions');

        $response->assertOk();
        $this->assertCount(count(VillageOrgPosition::ORG_TYPES) * 3, $response->json('data'));
        $this->assertSame([$user->village_id], array_values(array_unique($response->json('data.*.village_id'))));
    }

    #[Test]
    public function positions_cannot_be_created_updated_or_deleted(): void
    {
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);

        $this->actingAs($user)->postJson('/api/village-org-positions', [
            'org_type' => 'bpd',
            'position_label' => 'Sekretaris',
        ])->assertStatus(405);
        $this->actingAs($user)
            ->patchJson("/api/village-org-positions/{$position->id}", ['position_label' => 'Baru'])
            ->assertStatus(405);
        $this->actingAs($user)
            ->deleteJson("/api/village-org-positions/{$position->id}")
            ->assertStatus(405);

        $this->assertDatabaseHas('village_org_positions', ['id' => $position->id, 'position_label' => 'Ketua']);
    }

    #[Test]
    public function staf_sid_can_show_position_detail_with_all_members(): void
    {
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);
        VillageOrgMember::factory()->create(['position_id' => $position->id, 'is_active' => true]);
        VillageOrgMember::factory()->inactive()->create(['position_id' => $position->id]);

        $response = $this->actingAs($user)->getJson("/api/village-org-positions/{$position->id}");

        $response->assertOk()
            ->assertJsonPath('data.slot', 'ketua')
            ->assertJsonPath('data.position_label', 'Ketua');
        $this->assertCount(2, $response->json('data.members'));
    }

    #[Test]
    public function showing_nonexistent_position_returns_404(): void
    {
        $user = $this->stafSid();

        $response = $this->actingAs($user)->getJson('/api/village-org-positions/99999');

        $response->assertStatus(404);
    }

    /**
     * Guard multi-tenant (EV5-10-S2): Staf SIDUTama satu desa tidak boleh
     * bisa melihat jabatan milik desa lain hanya lewat ID.
     */
    #[Test]
    public function staf_sid_cannot_show_position_belonging_to_other_village(): void
    {
        $user = $this->stafSid();
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL2']);
        $position = VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id]);

        $response = $this->actingAs($user)->getJson("/api/village-org-positions/{$position->id}");

        $response->assertStatus(404);
    }
}
