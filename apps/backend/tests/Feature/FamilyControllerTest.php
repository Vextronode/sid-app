<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Rt;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyControllerTest extends TestCase
{
    use RefreshDatabase;

    private function stafSid(Village $village): User
    {
        return User::factory()->create([
            'village_id' => $village->id,
            'role' => 'staf_sid',
        ]);
    }

    // Satu RT untuk banyak KK; faktori bawaan membuat RT/RW baru per KK
    // dan kehabisan nomor RW unik.
    private function sharedWilayah(Village $village): array
    {
        $rt = Rt::factory()->create();

        return ['village_id' => $village->id, 'rt_id' => $rt->id, 'rw_id' => $rt->rw_id];
    }

    public function test_staf_sid_can_create_list_show_and_update_family(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);

        $created = $this->actingAs($user)
            ->postJson('/api/families', [
                'no_kk' => '3201011234560001',
                'family_address' => 'Jl. Merdeka No. 10',
            ])
            ->assertCreated()
            ->assertJsonPath('data.no_kk_masked', '************0001')
            ->assertJsonPath('data.family_status', 'aktif')
            ->json('data');

        $this->actingAs($user)
            ->getJson('/api/families')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($user)
            ->getJson("/api/families/{$created['id']}")
            ->assertOk()
            ->assertJsonPath('data.family_address', 'Jl. Merdeka No. 10');

        $this->actingAs($user)
            ->patchJson("/api/families/{$created['id']}", [
                'family_address' => 'Jl. Merdeka No. 12',
                'family_status' => 'pindah',
            ])
            ->assertOk()
            ->assertJsonPath('data.family_address', 'Jl. Merdeka No. 12')
            ->assertJsonPath('data.family_status', 'pindah');
    }

    public function test_no_kk_is_never_returned_as_plaintext(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);

        $response = $this->actingAs($user)
            ->postJson('/api/families', [
                'no_kk' => '3201011234560001',
                'family_address' => 'Jl. Merdeka No. 10',
            ])
            ->assertCreated();

        $response->assertJsonMissingPath('data.no_kk');
        $this->assertSame('************0001', $response->json('data.no_kk_masked'));
    }

    public function test_family_list_includes_head_citizen_from_family_role(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $family = Family::factory()->create(['village_id' => $village->id]);
        Citizen::factory()->create([
            'village_id' => $village->id,
            'family_id' => $family->id,
            'family_role' => 'kepala_keluarga',
            'name' => 'Budi Santoso',
        ]);
        Citizen::factory()->create([
            'village_id' => $village->id,
            'family_id' => $family->id,
            'family_role' => 'anak',
            'name' => 'Ani Santoso',
        ]);

        $this->actingAs($user)
            ->getJson('/api/families')
            ->assertOk()
            ->assertJsonPath('data.0.head_of_family.name', 'Budi Santoso')
            ->assertJsonPath('data.0.members_count', 2);
    }

    public function test_family_head_follows_the_current_family_roles(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $family = Family::factory()->create(['village_id' => $village->id]);
        $husband = Citizen::factory()->create([
            'village_id' => $village->id,
            'family_id' => $family->id,
            'family_role' => 'kepala_keluarga',
            'name' => 'Engkos',
        ]);
        $wife = Citizen::factory()->create([
            'village_id' => $village->id,
            'family_id' => $family->id,
            'family_role' => 'istri',
            'name' => 'Tini',
        ]);

        // Pisah KK: suami keluar ke KK baru, istri menjadi kepala KK lama.
        $husband->update(['family_id' => Family::factory()->create(['village_id' => $village->id])->id]);
        $wife->update(['family_role' => 'kepala_keluarga']);

        $this->actingAs($user)
            ->getJson("/api/families/{$family->id}")
            ->assertOk()
            ->assertJsonPath('data.head_of_family.name', 'Tini');

        $this->actingAs($user)
            ->getJson('/api/families/options')
            ->assertOk()
            ->assertJsonFragment(['id' => $family->id, 'head_of_family' => ['id' => $wife->id, 'name' => 'Tini']]);
    }

    public function test_no_kk_hash_is_generated_automatically(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);

        $this->actingAs($user)->postJson('/api/families', [
            'no_kk' => '3201011234560001',
            'family_address' => 'Jl. Merdeka No. 10',
        ])->assertCreated();

        $family = Family::first();

        $this->assertSame(hash('sha256', '3201011234560001'), $family->no_kk_hash);
    }

    public function test_duplicate_no_kk_is_rejected(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);

        Family::factory()->create([
            'village_id' => $village->id,
            'no_kk' => '3201011234560001',
            'no_kk_hash' => hash('sha256', '3201011234560001'),
        ]);

        $this->actingAs($user)
            ->postJson('/api/families', [
                'no_kk' => '3201011234560001',
                'family_address' => 'Jl. Merdeka No. 10',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('no_kk');
    }

    public function test_invalid_no_kk_format_is_rejected(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);

        $this->actingAs($user)
            ->postJson('/api/families', [
                'no_kk' => '12345',
                'family_address' => 'Jl. Merdeka No. 10',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('no_kk');
    }

    public function test_no_kk_cannot_be_changed_on_update(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $family = Family::factory()->create([
            'village_id' => $village->id,
            'no_kk' => '3201011234560001',
            'no_kk_hash' => hash('sha256', '3201011234560001'),
        ]);

        $this->actingAs($user)
            ->patchJson("/api/families/{$family->id}", [
                'no_kk' => '9999999999999999',
                'family_address' => 'Alamat Baru',
            ])
            ->assertOk();

        $this->assertSame('3201011234560001', $family->fresh()->no_kk);
    }

    public function test_non_staf_sid_cannot_create_family(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = User::factory()->create(['village_id' => $village->id, 'role' => 'rt']);

        $this->actingAs($user)
            ->postJson('/api/families', [
                'no_kk' => '3201011234560001',
                'family_address' => 'Jl. Merdeka No. 10',
            ])
            ->assertForbidden();
    }

    public function test_family_list_is_paginated_ten_per_page(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        Family::factory()->count(24)->create($this->sharedWilayah($village));

        $this->actingAs($user)
            ->getJson('/api/families')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.total', 24)
            ->assertJsonPath('meta.last_page', 3);

        $this->actingAs($user)
            ->getJson('/api/families?page=3')
            ->assertOk()
            ->assertJsonCount(4, 'data');
    }

    public function test_family_list_searches_full_no_kk_and_head_name(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $target = Family::factory()->create(['village_id' => $village->id, 'no_kk' => '3201011234560001']);
        $other = Family::factory()->create(['village_id' => $village->id, 'no_kk' => '3201011234560002']);
        Citizen::factory()->create([
            'village_id' => $village->id,
            'family_id' => $other->id,
            'family_role' => 'kepala_keluarga',
            'name' => 'Budi Santoso',
        ]);

        $this->actingAs($user)
            ->getJson('/api/families?search=3201011234560001')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $target->id);

        $this->actingAs($user)
            ->getJson('/api/families?search=budi')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $other->id);
    }

    public function test_family_options_returns_every_family_without_plain_no_kk(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        Family::factory()->count(12)->create($this->sharedWilayah($village));
        Family::factory()->create(['village_id' => Village::create(['name' => 'Desa Lain', 'code' => 'LAIN'])->id]);

        $response = $this->actingAs($user)
            ->getJson('/api/families/options')
            ->assertOk()
            ->assertJsonCount(12, 'data')
            ->assertJsonMissingPath('data.0.no_kk');

        $this->assertArrayHasKey('no_kk_masked', $response->json('data.0'));
    }

    public function test_non_staf_sid_cannot_list_family_options(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $warga = User::factory()->create(['village_id' => $village->id, 'role' => 'warga']);

        $this->actingAs($warga)->getJson('/api/families/options')->assertForbidden();
    }

    public function test_family_without_members_can_be_deleted(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $family = Family::factory()->create(['village_id' => $village->id]);

        $this->actingAs($user)
            ->deleteJson("/api/families/{$family->id}")
            ->assertOk();

        $this->assertNull(Family::find($family->id));
    }
}
