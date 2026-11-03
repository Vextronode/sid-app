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
            'role' => 'staf_sid',
        ]);
    }

    #[Test]
    public function endpoints_require_authentication_and_petugas_role(): void
    {
        $this->getJson('/api/occupations')->assertUnauthorized();

        $user = User::factory()->create(['role' => 'warga']);
        $occupation = Occupation::factory()->create(['village_id' => $user->village_id]);
        $this->actingAs($user)->postJson('/api/occupations', ['name' => 'Petani'])->assertForbidden();
        $this->actingAs($user)->patchJson("/api/occupations/{$occupation->id}", ['name' => 'Petani'])->assertForbidden();
        $this->actingAs($user)->deleteJson("/api/occupations/{$occupation->id}")->assertForbidden();
    }

    #[Test]
    public function other_roles_read_only_the_active_catalog_of_their_village_for_letter_forms(): void
    {
        $village = Village::factory()->create();
        Occupation::factory()->create(['village_id' => $village->id, 'name' => 'Petani']);
        Occupation::factory()->create(['village_id' => $village->id, 'name' => 'Nonaktif', 'is_active' => false]);
        Occupation::factory()->create(['name' => 'Desa Lain']);
        $warga = User::factory()->create(['role' => 'warga', 'village_id' => $village->id]);

        $this->actingAs($warga)->getJson('/api/occupations?include_inactive=true')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Petani')
            ->assertJsonMissingPath('data.0.citizens_count');
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

    #[Test]
    public function updating_to_a_taken_sort_order_swaps_positions(): void
    {
        $village = Village::factory()->create();
        $petani = Occupation::factory()->create(['village_id' => $village->id, 'name' => 'Petani', 'sort_order' => 1]);
        $guru = Occupation::factory()->create(['village_id' => $village->id, 'name' => 'Guru', 'sort_order' => 4]);
        $other = Occupation::factory()->create(['name' => 'Desa Lain', 'sort_order' => 1]);

        $this->actingAs($this->petugas($village))
            ->patchJson("/api/occupations/{$guru->id}", ['sort_order' => 1])
            ->assertOk();

        $this->assertSame(1, $guru->fresh()->sort_order);
        $this->assertSame(4, $petani->fresh()->sort_order);
        // Desa lain tidak ikut tergeser.
        $this->assertSame(1, $other->fresh()->sort_order);
    }

    #[Test]
    public function creating_with_a_taken_sort_order_moves_the_holder_to_the_end(): void
    {
        $village = Village::factory()->create();
        $petani = Occupation::factory()->create(['village_id' => $village->id, 'name' => 'Petani', 'sort_order' => 1]);
        Occupation::factory()->create(['village_id' => $village->id, 'name' => 'Guru', 'sort_order' => 3]);
        $user = $this->petugas($village);

        $this->actingAs($user)
            ->postJson('/api/occupations', ['name' => 'Nelayan', 'sort_order' => 1])
            ->assertCreated()
            ->assertJsonPath('data.sort_order', 1);

        $this->assertSame(4, $petani->fresh()->sort_order);

        // Tanpa urutan: masuk paling akhir, bukan 0.
        $this->actingAs($user)
            ->postJson('/api/occupations', ['name' => 'Pedagang'])
            ->assertCreated()
            ->assertJsonPath('data.sort_order', 5);
    }
}
