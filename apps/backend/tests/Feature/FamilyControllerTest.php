<?php

namespace Tests\Feature;

use App\Models\Family;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyControllerTest extends TestCase
{
    use RefreshDatabase;

    private function petugasDesa(Village $village): User
    {
        return User::factory()->create([
            'village_id' => $village->id,
            'role' => 'petugas_desa',
        ]);
    }

    public function test_petugas_desa_can_create_list_show_and_update_family(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->petugasDesa($village);

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
        $user = $this->petugasDesa($village);

        $response = $this->actingAs($user)
            ->postJson('/api/families', [
                'no_kk' => '3201011234560001',
                'family_address' => 'Jl. Merdeka No. 10',
            ])
            ->assertCreated();

        $response->assertJsonMissingPath('data.no_kk');
        $this->assertSame('************0001', $response->json('data.no_kk_masked'));
    }

    public function test_no_kk_hash_is_generated_automatically(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->petugasDesa($village);

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
        $user = $this->petugasDesa($village);

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
        $user = $this->petugasDesa($village);

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
        $user = $this->petugasDesa($village);
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

    public function test_non_petugas_desa_cannot_create_family(): void
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

    public function test_family_without_members_can_be_deleted(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->petugasDesa($village);
        $family = Family::factory()->create(['village_id' => $village->id]);

        $this->actingAs($user)
            ->deleteJson("/api/families/{$family->id}")
            ->assertOk();

        $this->assertNull(Family::find($family->id));
    }
}
