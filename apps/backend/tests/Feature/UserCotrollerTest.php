<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Rt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * EV5-11-S3. POST /users dan PATCH /users/{id} sesuai
 * paths/users/users.yaml & user-detail.yaml.
 */
class UserCotrollerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_all_users_wrapped_in_resource_collection(): void
    {
        // EV5-6-S2: UC-14 Kelola User & Role eksklusif petugas_desa.
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        User::factory()->count(2)->create();

        $this->actingAs($admin)
            ->getJson('/api/users')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_update_status_toggles_is_active(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $target = User::factory()->create(['is_active' => true]);

        $this->actingAs($admin)
            ->patchJson("/api/users/{$target->id}/toggle-status")
            ->assertOk()
            ->assertJsonPath('message', 'Status user berhasil diperbarui')
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('users', ['id' => $target->id, 'is_active' => false]);
    }

    public function test_store_creates_user_account(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $citizen = Citizen::factory()->create();

        $this->actingAs($admin)
            ->postJson('/api/users', [
                'name' => 'Ahmad Budiman',
                'email' => 'ahmad.budiman@cibenda.desa.id',
                'password' => 'Password123!',
                'role' => 'rt',
                'citizen_id' => $citizen->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Ahmad Budiman')
            ->assertJsonPath('data.role', 'rt')
            ->assertJsonMissingPath('data.password');

        $this->assertDatabaseHas('users', ['email' => 'ahmad.budiman@cibenda.desa.id', 'role' => 'rt']);
    }

    public function test_store_with_position_data_also_creates_official(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $citizen = Citizen::factory()->create();
        $rt = Rt::factory()->create();

        $response = $this->actingAs($admin)
            ->postJson('/api/users', [
                'name' => 'Ketua RT Baru',
                'email' => 'rt.baru@cibenda.desa.id',
                'password' => 'Password123!',
                'role' => 'rt',
                'citizen_id' => $citizen->id,
                'position_data' => [
                    'position' => 'rt',
                    'rt_id' => $rt->id,
                    'started_at' => now()->toDateString(),
                ],
            ])
            ->assertCreated();

        $userId = $response->json('data.id');

        $this->assertDatabaseHas('officials', [
            'user_id' => $userId,
            'citizen_id' => $citizen->id,
            'position' => 'rt',
            'rt_id' => $rt->id,
            'is_active' => true,
        ]);
    }

    public function test_store_with_sekdes_position_overrides_role_to_sekretaris_desa(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $citizen = Citizen::factory()->create();

        $response = $this->actingAs($admin)
            ->postJson('/api/users', [
                'name' => 'Calon Sekdes',
                'email' => 'sekdes@cibenda.desa.id',
                'password' => 'Password123!',
                'role' => 'rt',
                'citizen_id' => $citizen->id,
                'position_data' => [
                    'position' => 'sekdes',
                    'started_at' => now()->toDateString(),
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.role', 'sekretaris_desa');

        $this->assertDatabaseHas('officials', [
            'user_id' => $response->json('data.id'),
            'position' => 'sekdes',
        ]);
    }

    public function test_store_rejects_duplicate_email(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        User::factory()->create(['email' => 'dupe@cibenda.desa.id']);
        $citizen = Citizen::factory()->create();

        $this->actingAs($admin)
            ->postJson('/api/users', [
                'name' => 'Dupe',
                'email' => 'dupe@cibenda.desa.id',
                'password' => 'Password123!',
                'role' => 'rt',
                'citizen_id' => $citizen->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_store_rejects_unknown_citizen(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);

        $this->actingAs($admin)
            ->postJson('/api/users', [
                'name' => 'X',
                'email' => 'x@cibenda.desa.id',
                'password' => 'Password123!',
                'role' => 'rt',
                'citizen_id' => 999999,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['citizen_id']);
    }

    public function test_store_forbidden_for_non_petugas_desa(): void
    {
        $citizen = Citizen::factory()->create();

        $this->actingAs(User::factory()->create(['role' => 'rt']))
            ->postJson('/api/users', [
                'name' => 'X',
                'email' => 'x@cibenda.desa.id',
                'password' => 'Password123!',
                'role' => 'rt',
                'citizen_id' => $citizen->id,
            ])
            ->assertStatus(403);
    }

    public function test_update_changes_name_and_email(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $target = User::factory()->create();

        $this->actingAs($admin)
            ->patchJson("/api/users/{$target->id}", [
                'name' => 'Nama Baru',
                'email' => 'baru@cibenda.desa.id',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Nama Baru')
            ->assertJsonPath('data.email', 'baru@cibenda.desa.id');
    }

    public function test_update_rejects_self_deactivation(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);

        $this->actingAs($admin)
            ->patchJson("/api/users/{$admin->id}", ['is_active' => false])
            ->assertStatus(403)
            ->assertJsonPath('message', 'Anda tidak dapat menonaktifkan akun Anda sendiri.');
    }

    public function test_update_rejects_deactivating_the_last_active_petugas_desa(): void
    {
        // Aktor punya role petugas_desa (wajib lolos middleware
        // 'role:petugas_desa') tapi SUDAH nonaktif sendiri - skenario
        // tepi yang mungkin terjadi (akun dinonaktifkan pihak lain di
        // tengah sesi login yang masih berlaku). $lastPetugas adalah
        // satu-satunya akun petugas_desa yang MASIH aktif.
        $admin = User::factory()->create(['role' => 'petugas_desa', 'is_active' => false]);
        $lastPetugas = User::factory()->create(['role' => 'petugas_desa', 'is_active' => true]);

        $this->actingAs($admin)
            ->patchJson("/api/users/{$lastPetugas->id}", ['is_active' => false])
            ->assertStatus(403)
            ->assertJsonPath('message', 'Tidak dapat menonaktifkan satu-satunya akun Petugas Desa yang masih aktif.');
    }

    public function test_update_allows_deactivating_petugas_desa_when_another_remains_active(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $target = User::factory()->create(['role' => 'petugas_desa']);
        User::factory()->create(['role' => 'petugas_desa']);

        $this->actingAs($admin)
            ->patchJson("/api/users/{$target->id}", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);
    }

    public function test_update_forbidden_for_non_petugas_desa(): void
    {
        $target = User::factory()->create();

        $this->actingAs(User::factory()->create(['role' => 'rt']))
            ->patchJson("/api/users/{$target->id}", ['name' => 'X'])
            ->assertStatus(403);
    }
}
