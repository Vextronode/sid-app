<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Rt;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * EV5-11-S1. POST /citizens dan PATCH /citizens/{id} sesuai
 * paths/citizens/citizens.yaml & citizen-detail.yaml.
 */
class CitizenStoreUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function petugas(?Village $village = null): User
    {
        $village ??= Village::factory()->create();

        return User::factory()->create(['role' => 'petugas_desa', 'village_id' => $village->id]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'nik' => '3201012345670001',
            'name' => 'Siti Aminah',
            'date_of_birth' => '1990-05-12',
            'gender' => 'P',
            'address' => 'Jl. Merdeka No. 10',
            'rt_id' => Rt::factory()->create()->id,
        ], $overrides);
    }

    public function test_index_never_exposes_plaintext_nik(): void
    {
        Citizen::factory()->create(['nik' => '3201012345670001']);

        $this->actingAs(User::factory()->create())
            ->getJson('/api/citizens')
            ->assertOk()
            ->assertJsonPath('data.0.nik_masked', '************0001')
            ->assertJsonMissingPath('data.0.nik');
    }

    public function test_store_creates_citizen_with_encrypted_nik_hash_and_derived_rw(): void
    {
        $village = Village::factory()->create();
        $rt = Rt::factory()->create();

        $this->actingAs($this->petugas($village))
            ->postJson('/api/citizens', $this->payload(['rt_id' => $rt->id]))
            ->assertCreated()
            ->assertJsonPath('message', 'Data warga berhasil disimpan')
            ->assertJsonPath('data.nik_masked', '************0001')
            ->assertJsonPath('data.village_id', $village->id)
            ->assertJsonPath('data.rw_id', $rt->rw_id)
            ->assertJsonPath('data.residency_type', 'lokal')
            ->assertJsonPath('data.data_source', 'manual_input_desa');

        $this->assertDatabaseHas('citizens', ['nik_hash' => hash('sha256', '3201012345670001')]);
        $this->assertDatabaseMissing('citizens', ['nik' => '3201012345670001']);
    }

    public function test_store_with_v5_fields_and_family(): void
    {
        $village = Village::factory()->create();
        $family = Family::factory()->create(['village_id' => $village->id]);
        $father = Citizen::factory()->create();

        $this->actingAs($this->petugas($village))
            ->postJson('/api/citizens', $this->payload([
                'family_id' => $family->id,
                'family_role' => 'anak',
                'father_id' => $father->id,
                'mother_name_text' => 'Ibu Tidak Terdaftar',
                'blood_type' => 'O',
                'residency_type' => 'pendatang',
                'origin_region' => 'Bandung',
            ]))
            ->assertCreated()
            ->assertJsonPath('data.family.id', $family->id)
            ->assertJsonPath('data.family_role', 'anak')
            ->assertJsonPath('data.father_id', $father->id)
            ->assertJsonPath('data.blood_type', 'O')
            ->assertJsonPath('data.residency_type', 'pendatang');
    }

    public function test_store_rejects_duplicate_nik(): void
    {
        Citizen::factory()->create(['nik' => '3201012345670001']);

        $this->actingAs($this->petugas())
            ->postJson('/api/citizens', $this->payload())
            ->assertStatus(422)
            ->assertJsonPath('errors.nik.0', 'NIK sudah ada dalam database warga');
    }

    public function test_store_rejects_invalid_nik_format(): void
    {
        $this->actingAs($this->petugas())
            ->postJson('/api/citizens', $this->payload(['nik' => '123']))
            ->assertStatus(422)
            ->assertJsonPath('errors.nik.0', 'NIK harus 16 digit angka');
    }

    public function test_store_rejects_no_kk(): void
    {
        $this->actingAs($this->petugas())
            ->postJson('/api/citizens', $this->payload(['no_kk' => '3201012345670001']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['no_kk']);
    }

    public function test_store_requires_mandatory_fields(): void
    {
        $this->actingAs($this->petugas())
            ->postJson('/api/citizens', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nik', 'name', 'gender', 'address', 'rt_id', 'date_of_birth']);
    }

    public function test_store_rejects_second_kepala_keluarga_in_same_family(): void
    {
        $village = Village::factory()->create();
        $family = Family::factory()->create(['village_id' => $village->id]);
        Citizen::factory()->create(['family_id' => $family->id, 'family_role' => 'kepala_keluarga']);

        $this->actingAs($this->petugas($village))
            ->postJson('/api/citizens', $this->payload(['family_id' => $family->id, 'family_role' => 'kepala_keluarga']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['family_role']);
    }

    public function test_store_forbidden_for_non_petugas_desa(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'warga']))
            ->postJson('/api/citizens', $this->payload())
            ->assertForbidden();
    }

    public function test_store_requires_authentication(): void
    {
        $this->postJson('/api/citizens', $this->payload())->assertUnauthorized();
    }

    public function test_update_changes_editable_fields(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);

        $this->actingAs($this->petugas($village))
            ->patchJson("/api/citizens/{$citizen->id}", [
                'name' => 'Nama Baru',
                'domicile_status' => 'merantau_dalam_negeri',
                'current_domicile' => 'Jakarta Selatan',
                'residency_type' => 'pendatang',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Nama Baru')
            ->assertJsonPath('data.domicile_status', 'merantau_dalam_negeri')
            ->assertJsonPath('data.residency_type', 'pendatang');
    }

    public function test_update_rejects_nik_change(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);

        $this->actingAs($this->petugas($village))
            ->patchJson("/api/citizens/{$citizen->id}", ['nik' => '3201012345679999'])
            ->assertStatus(422)
            ->assertJsonPath('errors.nik.0', 'NIK tidak dapat diubah setelah data warga dibuat');
    }

    public function test_update_rt_change_rederives_rw(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $newRt = Rt::factory()->create();

        $this->actingAs($this->petugas($village))
            ->patchJson("/api/citizens/{$citizen->id}", ['rt_id' => $newRt->id])
            ->assertOk()
            ->assertJsonPath('data.rw_id', $newRt->rw_id);
    }

    public function test_update_moves_citizen_between_families(): void
    {
        $village = Village::factory()->create();
        $family = Family::factory()->create(['village_id' => $village->id]);
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);

        $this->actingAs($this->petugas($village))
            ->patchJson("/api/citizens/{$citizen->id}", ['family_id' => $family->id, 'family_role' => 'istri'])
            ->assertOk()
            ->assertJsonPath('data.family.id', $family->id)
            ->assertJsonPath('data.family_role', 'istri');
    }

    public function test_update_allows_resaving_same_kepala_keluarga_but_not_a_second_one(): void
    {
        $village = Village::factory()->create();
        $family = Family::factory()->create(['village_id' => $village->id]);
        $head = Citizen::factory()->create(['village_id' => $village->id, 'family_id' => $family->id, 'family_role' => 'kepala_keluarga']);
        $other = Citizen::factory()->create(['village_id' => $village->id, 'family_id' => $family->id, 'family_role' => 'anak']);

        $petugas = $this->petugas($village);

        $this->actingAs($petugas)
            ->patchJson("/api/citizens/{$head->id}", ['family_role' => 'kepala_keluarga', 'name' => 'Kepala Baru'])
            ->assertOk();

        $this->actingAs($petugas)
            ->patchJson("/api/citizens/{$other->id}", ['family_role' => 'kepala_keluarga'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['family_role']);
    }

    public function test_update_rejects_self_as_parent(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);

        $this->actingAs($this->petugas($village))
            ->patchJson("/api/citizens/{$citizen->id}", ['father_id' => $citizen->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['father_id']);
    }

    public function test_update_forbidden_for_citizen_in_other_village(): void
    {
        $citizen = Citizen::factory()->create();

        $this->actingAs($this->petugas())
            ->patchJson("/api/citizens/{$citizen->id}", ['name' => 'X'])
            ->assertForbidden();
    }

    public function test_update_forbidden_for_non_petugas_desa(): void
    {
        $citizen = Citizen::factory()->create();

        $this->actingAs(User::factory()->create(['role' => 'rt']))
            ->patchJson("/api/citizens/{$citizen->id}", ['name' => 'X'])
            ->assertForbidden();
    }

    public function test_update_returns_404_for_unknown_citizen(): void
    {
        $this->actingAs($this->petugas())
            ->patchJson('/api/citizens/999999', ['name' => 'X'])
            ->assertNotFound();
    }
}
