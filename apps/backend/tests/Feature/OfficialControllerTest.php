<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Official;
use App\Models\Rt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfficialControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_all_officials_for_manager_role(): void
    {
        $manager = User::factory()->create(['role' => 'kepala_desa']);
        Official::factory()->count(3)->create();

        $this->actingAs($manager)
            ->getJson('/api/officials')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_index_forbidden_for_non_manager_role(): void
    {
        $warga = User::factory()->create(['role' => 'warga']);

        $this->actingAs($warga)
            ->getJson('/api/officials')
            ->assertStatus(403);
    }

    public function test_index_requires_authentication(): void
    {
        $this->getJson('/api/officials')->assertUnauthorized();
    }

    public function test_show_returns_official_detail(): void
    {
        $manager = User::factory()->create(['role' => 'kepala_desa']);
        $official = Official::factory()->create();

        $this->actingAs($manager)
            ->getJson("/api/officials/{$official->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $official->id);
    }

    public function test_show_returns_404_for_unknown_official(): void
    {
        $manager = User::factory()->create(['role' => 'kepala_desa']);

        $this->actingAs($manager)
            ->getJson('/api/officials/999999')
            ->assertNotFound();
    }

    public function test_store_creates_official_for_manager_role(): void
    {
        $manager = User::factory()->create(['role' => 'kepala_desa']);
        $citizen = Citizen::factory()->create();

        $this->actingAs($manager)
            ->postJson('/api/officials', [
                'citizen_id' => $citizen->id,
                'position' => 'petugas_desa',
                'started_at' => now()->toDateString(),
            ])
            ->assertCreated()
            ->assertJsonPath('data.position', 'petugas_desa');

        $this->assertDatabaseHas('officials', [
            'citizen_id' => $citizen->id,
            'position' => 'petugas_desa',
        ]);
    }

    public function test_store_forbidden_for_non_manager_role(): void
    {
        $warga = User::factory()->create(['role' => 'warga']);
        $citizen = Citizen::factory()->create();

        $this->actingAs($warga)
            ->postJson('/api/officials', [
                'citizen_id' => $citizen->id,
                'position' => 'petugas_desa',
                'started_at' => now()->toDateString(),
            ])
            ->assertStatus(403);
    }

    public function test_store_validates_required_fields(): void
    {
        $manager = User::factory()->create(['role' => 'kepala_desa']);

        $this->actingAs($manager)
            ->postJson('/api/officials', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['citizen_id', 'position', 'started_at']);
    }

    public function test_store_rejects_duplicate_active_position_in_same_scope(): void
    {
        $manager = User::factory()->create(['role' => 'kepala_desa']);
        $rt = Rt::factory()->create();
        Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);
        $citizen = Citizen::factory()->create();

        $this->actingAs($manager)
            ->postJson('/api/officials', [
                'citizen_id' => $citizen->id,
                'position' => 'rt',
                'rt_id' => $rt->id,
                'started_at' => now()->toDateString(),
                'is_active' => true,
            ])
            ->assertStatus(409);
    }

    public function test_update_changes_official_fields(): void
    {
        $manager = User::factory()->create(['role' => 'kepala_desa']);
        $official = Official::factory()->create(['phone_wa' => '0800']);

        $this->actingAs($manager)
            ->patchJson("/api/officials/{$official->id}", [
                'phone_wa' => '0899',
            ])
            ->assertOk()
            ->assertJsonPath('data.phone_wa', '0899');

        $this->assertDatabaseHas('officials', ['id' => $official->id, 'phone_wa' => '0899']);
    }

    public function test_update_forbidden_for_non_manager_role(): void
    {
        $warga = User::factory()->create(['role' => 'warga']);
        $official = Official::factory()->create();

        $this->actingAs($warga)
            ->patchJson("/api/officials/{$official->id}", ['phone_wa' => '0899'])
            ->assertStatus(403);
    }

    public function test_destroy_deletes_official_for_manager_role(): void
    {
        $manager = User::factory()->create(['role' => 'kepala_desa']);
        $official = Official::factory()->create();

        $this->actingAs($manager)
            ->deleteJson("/api/officials/{$official->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Data pejabat berhasil dihapus.');

        $this->assertDatabaseMissing('officials', ['id' => $official->id]);
    }

    public function test_destroy_forbidden_for_non_manager_role(): void
    {
        $warga = User::factory()->create(['role' => 'warga']);
        $official = Official::factory()->create();

        $this->actingAs($warga)
            ->deleteJson("/api/officials/{$official->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('officials', ['id' => $official->id]);
    }
}
