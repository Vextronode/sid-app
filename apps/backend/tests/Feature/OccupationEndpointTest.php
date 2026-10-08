<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Occupation;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class OccupationEndpointTest extends TestCase
{
    use RefreshDatabase;

    private function petugas(Village $village): User
    {
        return User::factory()->create([
            'village_id' => $village->id,
            'role' => 'petugas_desa',
        ]);
    }

    #[Test]
    public function endpoints_require_authentication_and_petugas_role(): void
    {
        $this->getJson('/api/occupations')->assertUnauthorized();

        $user = User::factory()->create(['role' => 'warga']);
        $this->actingAs($user)->getJson('/api/occupations')->assertForbidden();
        $this->actingAs($user)->postJson('/api/occupations', ['name' => 'Petani'])->assertForbidden();
    }

    #[Test]
    public function list_is_scoped_to_village_and_active_by_default(): void
    {
        $village = Village::factory()->create();
        $otherVillage = Village::factory()->create();
        Occupation::factory()->create(['village_id' => $village->id, 'name' => 'Aktif', 'sort_order' => 2]);
        Occupation::factory()->create(['village_id' => $village->id, 'name' => 'Nonaktif', 'is_active' => false]);
        Occupation::factory()->create(['village_id' => $otherVillage->id, 'name' => 'Desa Lain']);
        $user = $this->petugas($village);

        $this->actingAs($user)->getJson('/api/occupations')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Aktif')
            ->assertJsonMissingPath('data.0.citizens_count');

        $this->actingAs($user)->getJson('/api/occupations?include_inactive=true')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.1.citizens_count', 0);
    }

    #[Test]
    public function create_trims_name_and_rejects_case_insensitive_duplicates_per_village(): void
    {
        $village = Village::factory()->create();
        $otherVillage = Village::factory()->create();
        $user = $this->petugas($village);

        $this->actingAs($user)->postJson('/api/occupations', ['name' => '  Petani  '])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Petani');

        $this->actingAs($user)->postJson('/api/occupations', ['name' => 'pEtAnI'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);

        $this->actingAs($this->petugas($otherVillage))
            ->postJson('/api/occupations', ['name' => 'PETANI'])
            ->assertCreated();
    }

    #[Test]
    public function occupation_can_be_renamed_and_deactivated(): void
    {
        $village = Village::factory()->create();
        $occupation = Occupation::factory()->create(['village_id' => $village->id, 'name' => 'Petani']);

        $this->actingAs($this->petugas($village))
            ->patchJson("/api/occupations/{$occupation->id}", ['name' => 'Pekebun', 'is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.name', 'Pekebun')
            ->assertJsonPath('data.is_active', false);
    }

    #[Test]
    public function unused_occupation_can_be_deleted_but_used_occupation_returns_conflict(): void
    {
        $village = Village::factory()->create();
        $user = $this->petugas($village);
        $unused = Occupation::factory()->create(['village_id' => $village->id]);
        $this->actingAs($user)->deleteJson("/api/occupations/{$unused->id}")->assertOk();

        $used = Occupation::factory()->create(['village_id' => $village->id]);
        Citizen::factory()->create(['village_id' => $village->id, 'occupation_id' => $used->id]);

        $this->actingAs($user)->deleteJson("/api/occupations/{$used->id}")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Pekerjaan masih dipakai 1 warga. Nonaktifkan saja bila tidak ingin ditampilkan lagi.');
    }

    #[Test]
    public function foreign_village_occupation_cannot_be_updated_or_deleted(): void
    {
        $otherVillage = Village::factory()->create();
        $occupation = Occupation::factory()->create(['village_id' => $otherVillage->id]);
        $user = $this->petugas(Village::factory()->create());

        $this->actingAs($user)->patchJson("/api/occupations/{$occupation->id}", ['name' => 'Changed'])->assertNotFound();
        $this->actingAs($user)->deleteJson("/api/occupations/{$occupation->id}")->assertNotFound();
    }
}
