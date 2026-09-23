<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\CitizenSocioeconomic;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-3-S3 — Feature test untuk GET/PUT /citizens/{id}/socioeconomic.
 *
 * Cakupan kondisi:
 *  - Seluruh endpoint butuh login (401 untuk guest).
 *  - Seluruh endpoint ditolak (403) untuk role selain petugas_desa.
 *  - GET mengembalikan 404 jika warga belum pernah disurvei.
 *  - PUT (upsert) sukses membuat data baru, surveyed_by/surveyed_at
 *    otomatis terisi dari user login + waktu request.
 *  - PUT kedua kalinya meng-update (bukan duplikat) data yang sama.
 *  - PUT gagal validasi (422) untuk nilai enum yang tidak valid.
 */
class CitizenSocioeconomicEndpointTest extends TestCase
{
    use RefreshDatabase;

    private function petugasDesa(Village $village): User
    {
        return User::factory()->create([
            'village_id' => $village->id,
            'role' => 'petugas_desa',
        ]);
    }

    #[Test]
    public function guest_cannot_view_socioeconomic_data(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);

        $response = $this->getJson("/api/citizens/{$citizen->id}/socioeconomic");

        $response->assertStatus(401);
    }

    #[Test]
    public function non_petugas_desa_cannot_view_or_upsert_socioeconomic_data(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $user = User::factory()->create(['village_id' => $village->id, 'role' => 'warga']);

        $this->actingAs($user)
            ->getJson("/api/citizens/{$citizen->id}/socioeconomic")
            ->assertStatus(403);

        $this->actingAs($user)
            ->putJson("/api/citizens/{$citizen->id}/socioeconomic", ['income_range' => '3-5jt'])
            ->assertStatus(403);
    }

    #[Test]
    public function get_returns_404_when_citizen_not_yet_surveyed(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $user = $this->petugasDesa($village);

        $response = $this->actingAs($user)->getJson("/api/citizens/{$citizen->id}/socioeconomic");

        $response->assertStatus(404);
    }

    #[Test]
    public function petugas_desa_can_upsert_socioeconomic_data(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $user = $this->petugasDesa($village);

        $response = $this->actingAs($user)->putJson("/api/citizens/{$citizen->id}/socioeconomic", [
            'income_range' => '3-5jt',
            'house_ownership_status' => 'milik_sendiri',
            'water_source' => 'pdam',
            'electricity_source' => 'pln',
            'dependents_count' => 3,
            'productive_assets' => ['kendaraan' => 'motor'],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.citizen_id', $citizen->id)
            ->assertJsonPath('data.income_range', '3-5jt')
            ->assertJsonPath('data.dependents_count', 3)
            ->assertJsonPath('data.surveyed_by', $user->id);

        $this->assertNotNull($response->json('data.surveyed_at'));

        $this->assertDatabaseCount('citizen_socioeconomics', 1);

        $this->actingAs($user)
            ->getJson("/api/citizens/{$citizen->id}/socioeconomic")
            ->assertOk()
            ->assertJsonPath('data.water_source', 'pdam');
    }

    #[Test]
    public function upserting_twice_updates_the_same_record_instead_of_duplicating(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $user = $this->petugasDesa($village);

        $this->actingAs($user)->putJson("/api/citizens/{$citizen->id}/socioeconomic", [
            'income_range' => '<1jt',
        ])->assertOk();

        $this->actingAs($user)->putJson("/api/citizens/{$citizen->id}/socioeconomic", [
            'income_range' => '>10jt',
        ])->assertOk()->assertJsonPath('data.income_range', '>10jt');

        $this->assertDatabaseCount('citizen_socioeconomics', 1);
        $this->assertSame(1, CitizenSocioeconomic::where('citizen_id', $citizen->id)->count());
    }

    #[Test]
    public function upsert_fails_validation_for_invalid_enum_value(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $user = $this->petugasDesa($village);

        $response = $this->actingAs($user)->putJson("/api/citizens/{$citizen->id}/socioeconomic", [
            'income_range' => 'jutaan-banget',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['income_range']);
    }
}
