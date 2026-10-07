<?php

namespace Tests\Feature;

use App\Models\Family;
use App\Models\FamilySocioeconomic;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class FamilySocioeconomicEndpointTest extends TestCase
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
    public function guest_cannot_view_family_socioeconomic_data(): void
    {
        $family = Family::factory()->create();

        $this->getJson("/api/families/{$family->id}/socioeconomic")->assertUnauthorized();
    }

    #[Test]
    public function non_petugas_desa_cannot_view_or_upsert_family_socioeconomic_data(): void
    {
        $family = Family::factory()->create();
        $user = User::factory()->create(['village_id' => $family->village_id, 'role' => 'warga']);

        $this->actingAs($user)
            ->getJson("/api/families/{$family->id}/socioeconomic")
            ->assertForbidden();

        $this->actingAs($user)
            ->putJson("/api/families/{$family->id}/socioeconomic", ['household_income_range' => '3-5jt'])
            ->assertForbidden();
    }

    #[Test]
    public function get_returns_404_when_family_not_yet_surveyed(): void
    {
        $family = Family::factory()->create();

        $this->actingAs($this->petugasDesa(Village::findOrFail($family->village_id)))
            ->getJson("/api/families/{$family->id}/socioeconomic")
            ->assertNotFound()
            ->assertJsonPath('message', 'Data sosio-ekonomi belum tersedia untuk keluarga ini.');
    }

    #[Test]
    public function petugas_can_upsert_family_socioeconomic_data(): void
    {
        $family = Family::factory()->create();
        $user = $this->petugasDesa(Village::findOrFail($family->village_id));

        $response = $this->actingAs($user)
            ->putJson("/api/families/{$family->id}/socioeconomic", [
                'household_income_range' => '3-5jt',
                'house_ownership_status' => 'milik_sendiri',
                'water_source' => 'pdam',
                'electricity_source' => 'pln',
                'dependents_count' => 3,
                'productive_assets' => ['kendaraan' => 'motor'],
            ]);

        $response->assertOk()
            ->assertJsonPath('data.family_id', $family->id)
            ->assertJsonPath('data.household_income_range', '3-5jt')
            ->assertJsonPath('data.dependents_count', 3)
            ->assertJsonPath('data.surveyed_by', $user->id);
        $this->assertNotNull($response->json('data.surveyed_at'));
        $this->assertDatabaseCount('family_socioeconomics', 1);

        $this->actingAs($user)
            ->getJson("/api/families/{$family->id}/socioeconomic")
            ->assertOk()
            ->assertJsonPath('data.water_source', 'pdam');
    }

    #[Test]
    public function upserting_twice_updates_the_same_family_row(): void
    {
        $family = Family::factory()->create();
        $user = $this->petugasDesa(Village::findOrFail($family->village_id));
        $endpoint = "/api/families/{$family->id}/socioeconomic";

        $this->actingAs($user)->putJson($endpoint, ['household_income_range' => '<1jt'])->assertOk();
        $this->actingAs($user)->putJson($endpoint, ['household_income_range' => '>10jt'])
            ->assertOk()
            ->assertJsonPath('data.household_income_range', '>10jt');

        $this->assertSame(1, FamilySocioeconomic::where('family_id', $family->id)->count());
    }

    #[Test]
    public function invalid_income_enum_is_rejected_and_old_citizen_route_is_gone(): void
    {
        $family = Family::factory()->create();
        $user = $this->petugasDesa(Village::findOrFail($family->village_id));

        $this->actingAs($user)
            ->putJson("/api/families/{$family->id}/socioeconomic", ['household_income_range' => 'jutaan-banget'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['household_income_range']);

        $this->actingAs($user)
            ->getJson('/api/citizens/00000000-0000-0000-0000-000000000000/socioeconomic')
            ->assertNotFound();
    }

    #[Test]
    public function family_from_another_village_is_not_found(): void
    {
        $family = Family::factory()->create();
        $otherVillage = Village::factory()->create();
        $user = $this->petugasDesa($otherVillage);

        $this->actingAs($user)
            ->getJson("/api/families/{$family->id}/socioeconomic")
            ->assertNotFound();
        $this->actingAs($user)
            ->putJson("/api/families/{$family->id}/socioeconomic", ['dependents_count' => 1])
            ->assertNotFound();
    }
}
