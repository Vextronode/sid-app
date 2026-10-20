<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Village;
use App\Models\VillageOrgMember;
use App\Models\VillageOrgPosition;
use App\Repositories\VillageOrgPositionRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * GET /public/village-orgs/{orgType}: struktur BPD/LPM/Karang Taruna/PKK
 * di halaman publik, tanpa login.
 */
class PublicVillageOrgEndpointTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, VillageOrgPosition>
     */
    private function slots(Village $village, string $orgType): array
    {
        (new VillageOrgPositionRepository)->ensureSlots($village->id, $orgType);

        return VillageOrgPosition::query()
            ->where('village_id', $village->id)
            ->where('org_type', $orgType)
            ->get()
            ->keyBy('slot')
            ->all();
    }

    #[Test]
    public function returns_active_ketua_wakil_and_anggota_without_login(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $slots = $this->slots($village, 'bpd');

        VillageOrgMember::factory()->create([
            'position_id' => $slots['ketua']->id,
            'member_name' => 'Ketua Aktif',
            'phone_wa' => '628123',
            'photo_img' => 'org-member-photos/ketua.jpg',
            'is_active' => true,
        ]);
        VillageOrgMember::factory()->inactive()->create([
            'position_id' => $slots['ketua']->id,
            'member_name' => 'Ketua Lama',
        ]);
        VillageOrgMember::factory()->create([
            'position_id' => $slots['anggota']->id,
            'member_name' => 'Anggota Satu',
            'started_at' => '2024-01-01',
            'is_active' => true,
        ]);
        VillageOrgMember::factory()->create([
            'position_id' => $slots['anggota']->id,
            'member_name' => 'Anggota Dua',
            'started_at' => '2025-01-01',
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/public/village-orgs/bpd');

        $response->assertOk()
            ->assertJsonPath('data.org_type', 'bpd')
            ->assertJsonPath('data.ketua.name', 'Ketua Aktif')
            ->assertJsonPath('data.ketua.photo_url', fn ($url) => str_ends_with((string) $url, 'org-member-photos/ketua.jpg'))
            ->assertJsonPath('data.wakil_ketua', null)
            ->assertJsonPath('data.anggota.0.name', 'Anggota Satu')
            ->assertJsonPath('data.anggota.1.name', 'Anggota Dua')
            ->assertJsonMissingPath('data.ketua.phone_wa');
    }

    #[Test]
    public function returns_empty_structure_when_organization_has_no_slots_yet(): void
    {
        Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);

        $this->getJson('/api/public/village-orgs/pkk')
            ->assertOk()
            ->assertJsonPath('data.ketua', null)
            ->assertJsonPath('data.wakil_ketua', null)
            ->assertJsonPath('data.anggota', []);

        $this->assertSame(0, VillageOrgPosition::query()->count());
    }

    #[Test]
    public function rejects_unknown_organization_type(): void
    {
        Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);

        $this->getJson('/api/public/village-orgs/bumdes')->assertNotFound();
    }

    #[Test]
    public function cache_is_refreshed_after_member_changes(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $petugas = User::factory()->create(['role' => 'staf_sid', 'village_id' => $village->id]);
        $slots = $this->slots($village, 'lpm');

        $this->getJson('/api/public/village-orgs/lpm')->assertJsonPath('data.ketua', null);

        $this->actingAs($petugas)->postJson("/api/village-org-positions/{$slots['ketua']->id}/members", [
            'member_name' => 'Ketua Baru',
            'started_at' => '2026-10-01',
        ])->assertCreated();

        $this->getJson('/api/public/village-orgs/lpm')->assertJsonPath('data.ketua.name', 'Ketua Baru');
    }
}
