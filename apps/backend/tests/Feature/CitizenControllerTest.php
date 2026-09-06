<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CitizenControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_citizens_wrapped_in_resource_collection(): void
    {
        $user = User::factory()->create();
        Citizen::factory()->count(2)->create();

        $this->actingAs($user)
            ->getJson('/api/citizens')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'nik', 'village', 'rt', 'rw', 'hamlet'],
                ],
            ]);
    }

    public function test_destroy_deletes_citizen(): void
    {
        $user = User::factory()->create();
        $citizen = Citizen::factory()->create();

        $this->actingAs($user)
            ->deleteJson("/api/citizens/{$citizen->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Data warga berhasil dihapus.');

        $this->assertDatabaseMissing('citizens', ['id' => $citizen->id]);
    }

    public function test_wilayah_returns_distinct_rt_rw_pairs(): void
    {
        $user = User::factory()->create();
        Citizen::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/citizens/wilayah')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }
}
