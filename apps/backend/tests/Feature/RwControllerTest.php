<?php

namespace Tests\Feature;

use App\Models\Hamlet;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class RwControllerTest extends TestCase
{
    use RefreshDatabase;

    private function petugasDesa(Village $village): User
    {
        return User::factory()->create([
            'village_id' => $village->id,
            'role' => 'petugas_desa',
        ]);
    }

    public function test_petugas_desa_can_create_list_update_and_delete_rws(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->petugasDesa($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);

        $this->actingAs($user)
            ->postJson('/api/rws', ['hamlet_id' => $hamlet->id, 'number' => '001'])
            ->assertCreated()
            ->assertJsonPath('data.full_label', 'RW 001');

        $rw = Rw::firstWhere('hamlet_id', $hamlet->id);

        $this->actingAs($user)
            ->getJson("/api/rws?hamlet_id={$hamlet->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($user)
            ->patchJson("/api/rws/{$rw->id}", ['number' => '002'])
            ->assertOk()
            ->assertJsonPath('data.full_label', 'RW 002');

        $this->actingAs($user)
            ->deleteJson("/api/rws/{$rw->id}")
            ->assertOk();

        $this->assertNull(Rw::find($rw->id));
    }

    public function test_non_petugas_desa_cannot_create_rw(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = User::factory()->create(['village_id' => $village->id, 'role' => 'rt']);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);

        $this->actingAs($user)
            ->postJson('/api/rws', ['hamlet_id' => $hamlet->id, 'number' => '001'])
            ->assertForbidden();
    }

    public function test_duplicate_rw_number_within_same_hamlet_is_rejected(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->petugasDesa($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        Rw::create(['hamlet_id' => $hamlet->id, 'number' => '001', 'full_label' => 'RW 001', 'is_active' => true]);

        $this->actingAs($user)
            ->postJson('/api/rws', ['hamlet_id' => $hamlet->id, 'number' => '001'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('number');
    }

    public function test_deactivating_rw_with_active_citizens_is_blocked(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->petugasDesa($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'number' => '001', 'full_label' => 'RW 001', 'is_active' => true]);

        Citizen::create([
            'village_id' => $village->id,
            'nik' => '3218030101010002',
            'nik_hash' => hash('sha256', '3218030101010002'),
            'name' => 'Warga Aktif RW',
            'date_of_birth' => '1990-01-01',
            'gender' => 'L',
            'address' => 'Desa Cibenda',
            'rw_id' => $rw->id,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->patchJson("/api/rws/{$rw->id}", ['is_active' => false])
            ->assertStatus(409);

        $this->actingAs($user)
            ->deleteJson("/api/rws/{$rw->id}")
            ->assertStatus(409);
    }
}
