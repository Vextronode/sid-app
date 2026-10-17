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
        // EV5-6-S2: /citizens eksklusif staf_sid (UC-09) — role-check
        // kini ditegakkan middleware, sehingga factory user di test harus
        // eksplisit menyertakan role yang berwenang.
        $user = User::factory()->create(['role' => 'staf_sid']);
        Citizen::factory()->count(2)->create();

        $this->actingAs($user)
            ->getJson('/api/citizens')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'nik_masked', 'village', 'rt', 'rw', 'hamlet'],
                ],
            ]);
    }

    public function test_index_is_paginated_with_meta(): void
    {
        $user = User::factory()->create(['role' => 'staf_sid']);
        Citizen::factory()->count(5)->create();

        $this->actingAs($user)
            ->getJson('/api/citizens?per_page=2&page=3')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('total', 5)
            ->assertJsonPath('meta.current_page', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.total', 5)
            ->assertJsonPath('meta.last_page', 3);

        $this->actingAs($user)
            ->getJson('/api/citizens?per_page=101')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('per_page');
    }

    public function test_index_filters_by_name_and_rt_on_the_server(): void
    {
        $user = User::factory()->create(['role' => 'staf_sid']);
        $target = Citizen::factory()->create(['name' => 'Siti Aminah']);
        Citizen::factory()->create(['name' => 'Budi Santoso']);

        $this->actingAs($user)
            ->getJson('/api/citizens?search=AMINAH')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $target->id);

        $this->actingAs($user)
            ->getJson('/api/citizens?rt_id='.$target->rt_id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $target->id);
    }

    public function test_destroy_deletes_citizen(): void
    {
        $user = User::factory()->create(['role' => 'staf_sid']);
        $citizen = Citizen::factory()->create();

        $this->actingAs($user)
            ->deleteJson("/api/citizens/{$citizen->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Data warga berhasil dihapus.');

        $this->assertDatabaseMissing('citizens', ['id' => $citizen->id]);
    }

    public function test_wilayah_returns_distinct_rt_rw_pairs(): void
    {
        $user = User::factory()->create(['role' => 'staf_sid']);
        Citizen::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/citizens/wilayah')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }
}
