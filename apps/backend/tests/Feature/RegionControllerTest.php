<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegionControllerTest extends TestCase
{
    use RefreshDatabase;

    private function petugasDesa(Village $village): User
    {
        return User::factory()->create([
            'village_id' => $village->id,
            'role' => 'petugas_desa',
        ]);
    }

    public function test_petugas_desa_can_create_list_and_update_hamlets(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->petugasDesa($village);

        $this->actingAs($user)
            ->postJson('/api/hamlets', ['name' => 'Dusun Patrol', 'code' => 'PTR'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Dusun Patrol');

        $hamlet = Hamlet::firstWhere('code', 'PTR');

        $this->actingAs($user)
            ->getJson('/api/hamlets')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($user)
            ->patchJson("/api/hamlets/{$hamlet->id}", ['name' => 'Dusun Patrol Baru'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Dusun Patrol Baru');
    }

    public function test_non_petugas_desa_cannot_create_hamlet(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = User::factory()->create(['village_id' => $village->id, 'role' => 'rt']);

        $this->actingAs($user)
            ->postJson('/api/hamlets', ['name' => 'Dusun Patrol', 'code' => 'PTR'])
            ->assertForbidden();
    }

    public function test_duplicate_hamlet_code_is_rejected(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->petugasDesa($village);
        Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);

        $this->actingAs($user)
            ->postJson('/api/hamlets', ['name' => 'Dusun B', 'code' => 'PTR'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');
    }

    public function test_deactivating_hamlet_with_active_citizens_is_blocked(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->petugasDesa($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);

        Citizen::create([
            'village_id' => $village->id,
            'nik' => '3218030101010001',
            'nik_hash' => hash('sha256', '3218030101010001'),
            'name' => 'Warga Aktif',
            'date_of_birth' => '1990-01-01',
            'gender' => 'L',
            'address' => 'Desa Cibenda',
            'hamlet_id' => $hamlet->id,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->patchJson("/api/hamlets/{$hamlet->id}", ['is_active' => false])
            ->assertStatus(409);

        $this->assertTrue($hamlet->fresh()->is_active);
    }

    public function test_deactivating_hamlet_without_active_citizens_succeeds(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->petugasDesa($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);

        $this->actingAs($user)
            ->patchJson("/api/hamlets/{$hamlet->id}", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);
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

    public function test_petugas_desa_can_create_list_update_and_delete_rts(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->petugasDesa($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'number' => '001', 'full_label' => 'RW 001', 'is_active' => true]);

        $this->actingAs($user)
            ->postJson('/api/rts', ['rw_id' => $rw->id, 'number' => '001'])
            ->assertCreated()
            ->assertJsonPath('data.full_label', 'RT 001 / RW 001');

        $rt = Rt::firstWhere('rw_id', $rw->id);

        $this->actingAs($user)
            ->getJson("/api/rts?rw_id={$rw->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($user)
            ->patchJson("/api/rts/{$rt->id}", ['number' => '002'])
            ->assertOk()
            ->assertJsonPath('data.full_label', 'RT 002 / RW 001');

        $this->actingAs($user)
            ->deleteJson("/api/rts/{$rt->id}")
            ->assertOk();

        $this->assertNull(Rt::find($rt->id));
    }

    public function test_non_petugas_desa_cannot_create_rt(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = User::factory()->create(['village_id' => $village->id, 'role' => 'rt']);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'number' => '001', 'full_label' => 'RW 001', 'is_active' => true]);

        $this->actingAs($user)
            ->postJson('/api/rts', ['rw_id' => $rw->id, 'number' => '001'])
            ->assertForbidden();
    }

    public function test_duplicate_rt_number_within_same_rw_is_rejected(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->petugasDesa($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'number' => '001', 'full_label' => 'RW 001', 'is_active' => true]);
        Rt::create(['rw_id' => $rw->id, 'number' => '001', 'full_label' => 'RT 001 / RW 001', 'is_active' => true]);

        $this->actingAs($user)
            ->postJson('/api/rts', ['rw_id' => $rw->id, 'number' => '001'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('number');
    }

    public function test_deactivating_rt_with_active_citizens_is_blocked(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->petugasDesa($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'number' => '001', 'full_label' => 'RW 001', 'is_active' => true]);
        $rt = Rt::create(['rw_id' => $rw->id, 'number' => '001', 'full_label' => 'RT 001 / RW 001', 'is_active' => true]);

        Citizen::create([
            'village_id' => $village->id,
            'nik' => '3218030101010003',
            'nik_hash' => hash('sha256', '3218030101010003'),
            'name' => 'Warga Aktif RT',
            'date_of_birth' => '1990-01-01',
            'gender' => 'L',
            'address' => 'Desa Cibenda',
            'rt_id' => $rt->id,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->patchJson("/api/rts/{$rt->id}", ['is_active' => false])
            ->assertStatus(409);

        $this->actingAs($user)
            ->deleteJson("/api/rts/{$rt->id}")
            ->assertStatus(409);
    }
}
