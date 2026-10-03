<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_users_for_petugas_desa(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        User::factory()->count(2)->create();

        $this->actingAs($admin)
            ->getJson('/api/users')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_user_can_update_name_but_not_email(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $target = User::factory()->create(['name' => 'Nama Lama', 'email' => 'lama@example.test']);

        $this->actingAs($admin)
            ->patchJson("/api/users/{$target->id}", [
                'name' => 'Nama Baru',
                'email' => 'baru@example.test',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Nama Baru')
            ->assertJsonPath('data.email', 'lama@example.test');
    }

    public function test_user_status_can_be_toggled_and_self_deactivation_is_rejected(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $target = User::factory()->create(['is_active' => true]);

        $this->actingAs($admin)
            ->patchJson("/api/users/{$target->id}/toggle-status")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->actingAs($admin)
            ->patchJson("/api/users/{$admin->id}/toggle-status")
            ->assertForbidden()
            ->assertJsonPath('message', 'Anda tidak dapat menonaktifkan akun Anda sendiri.');
    }

    public function test_petugas_can_reset_non_petugas_password_and_user_must_change_it(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $target = User::factory()->create(['role' => 'warga']);

        $response = $this->actingAs($admin)
            ->postJson("/api/users/{$target->id}/reset-password")
            ->assertOk()
            ->assertJsonStructure(['message', 'temporary_password']);

        $this->assertSame(12, strlen($response->json('temporary_password')));
        $this->assertTrue($target->fresh()->must_change_password);
    }

    public function test_reset_password_is_forbidden_for_self_and_other_petugas(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $otherPetugas = User::factory()->create(['role' => 'petugas_desa']);

        $this->actingAs($admin)
            ->postJson("/api/users/{$admin->id}/reset-password")
            ->assertForbidden();
        $this->actingAs($admin)
            ->postJson("/api/users/{$otherPetugas->id}/reset-password")
            ->assertForbidden();
    }

    public function test_user_management_is_forbidden_for_non_petugas_desa(): void
    {
        $user = User::factory()->create(['role' => 'rt']);
        $target = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/users')
            ->assertForbidden();
        $this->actingAs($user)
            ->postJson("/api/users/{$target->id}/reset-password")
            ->assertForbidden();
    }

    public function test_post_users_creation_route_has_been_removed(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'petugas_desa']))
            ->postJson('/api/users', [])
            ->assertMethodNotAllowed();
    }
}
