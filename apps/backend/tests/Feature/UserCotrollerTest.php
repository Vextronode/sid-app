<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserCotrollerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_all_users_wrapped_in_resource_collection(): void
    {
        $admin = User::factory()->create();
        User::factory()->count(2)->create();

        $this->actingAs($admin)
            ->getJson('/api/users')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_update_status_toggles_is_active(): void
    {
        $admin = User::factory()->create();
        $target = User::factory()->create(['is_active' => true]);

        $this->actingAs($admin)
            ->patchJson("/api/users/{$target->id}/toggle-status")
            ->assertOk()
            ->assertJsonPath('message', 'Status user berhasil diperbarui')
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('users', ['id' => $target->id, 'is_active' => false]);
    }
}
