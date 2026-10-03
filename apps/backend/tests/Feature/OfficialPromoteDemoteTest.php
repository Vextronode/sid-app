<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Official;
use App\Models\Rt;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfficialPromoteDemoteTest extends TestCase
{
    use RefreshDatabase;

    public function test_petugas_can_promote_citizen_user_and_activity_is_recorded(): void
    {
        $village = Village::factory()->create();
        $actor = User::factory()->create(['role' => 'petugas_desa', 'village_id' => $village->id]);
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $target = User::factory()->create([
            'role' => 'warga',
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);
        $rt = Rt::factory()->create(['village_id' => $village->id]);

        $response = $this->actingAs($actor)
            ->postJson('/api/officials/promote', [
                'user_id' => $target->id,
                'position' => 'rt',
                'rt_id' => $rt->id,
                'started_at' => today()->toDateString(),
                'term_ends_at' => today()->addYear()->toDateString(),
            ])
            ->assertCreated()
            ->assertJsonPath('data.user_id', $target->id)
            ->assertJsonPath('data.position', 'rt')
            ->assertJsonPath('data.term_ends_at', today()->addYear()->startOfDay()->toISOString());

        $this->assertSame('rt', $target->fresh()->role);
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'official',
            'description' => 'promoted',
            'subject_id' => (string) $response->json('data.id'),
            'causer_id' => (string) $actor->id,
        ]);
    }

    public function test_promote_is_forbidden_to_non_petugas_and_validates_input(): void
    {
        $citizen = Citizen::factory()->create();
        $target = User::factory()->create(['citizen_id' => $citizen->id]);

        $this->actingAs(User::factory()->create(['role' => 'rt']))
            ->postJson('/api/officials/promote', [])
            ->assertForbidden();

        $actor = User::factory()->create(['role' => 'petugas_desa']);
        $this->actingAs($actor)
            ->postJson('/api/officials/promote', [
                'user_id' => $target->id,
                'position' => 'not-a-position',
                'started_at' => 'invalid',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['position', 'started_at']);
    }

    public function test_promote_rejects_target_not_in_actor_village(): void
    {
        $actor = User::factory()->create([
            'role' => 'petugas_desa',
            'village_id' => Village::factory(),
        ]);
        $targetVillage = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $targetVillage->id]);
        $target = User::factory()->create([
            'role' => 'warga',
            'village_id' => $targetVillage->id,
            'citizen_id' => $citizen->id,
        ]);

        $this->actingAs($actor)
            ->postJson('/api/officials/promote', [
                'user_id' => $target->id,
                'position' => 'sekdes',
                'started_at' => today()->toDateString(),
            ])
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Akun target harus warga aktif yang belum menjabat dan terhubung ke data kependudukan.',
            );
    }

    public function test_demote_returns_warnings_and_updates_user_role(): void
    {
        $village = Village::factory()->create();
        $actor = User::factory()->create(['role' => 'petugas_desa', 'village_id' => $village->id]);
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $target = User::factory()->create([
            'role' => 'sekretaris_desa',
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);
        $official = Official::factory()->forUser($target)->position('sekdes')->create([
            'village_id' => $village->id,
        ]);

        $response = $this->actingAs($actor)
            ->postJson("/api/officials/{$official->id}/demote", ['notes' => 'Selesai masa tugas'])
            ->assertOk()
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('warnings', []);

        $this->assertSame('warga', $target->fresh()->role);
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'official',
            'description' => 'demoted',
            'subject_id' => (string) $official->id,
        ]);
    }

    public function test_demote_forbidden_to_non_petugas_and_petugas_cannot_remove_last_one(): void
    {
        $target = User::factory()->create(['role' => 'rt']);
        $official = Official::factory()->forUser($target)->position('rt')->create();

        $this->actingAs(User::factory()->create(['role' => 'warga']))
            ->postJson("/api/officials/{$official->id}/demote")
            ->assertForbidden();

        $petugas = User::factory()->create(['role' => 'petugas_desa']);
        $petugasOfficial = Official::factory()->forUser($petugas)->position('petugas_desa')->create();

        $this->actingAs($petugas)
            ->postJson("/api/officials/{$petugasOfficial->id}/demote")
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'Aksi gagal karena Anda adalah petugas tersisa. Petugas desa tidak boleh kosong.',
            );
    }

    public function test_rotate_requires_new_user_without_client_supplied_citizen_id(): void
    {
        $village = Village::factory()->create();
        $actor = User::factory()->create(['role' => 'petugas_desa', 'village_id' => $village->id]);
        $oldUser = User::factory()->create(['role' => 'sekretaris_desa', 'village_id' => $village->id]);
        $old = Official::factory()->forUser($oldUser)->position('sekdes')->create(['village_id' => $village->id]);
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $newUser = User::factory()->create([
            'role' => 'warga',
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $this->actingAs($actor)
            ->postJson("/api/officials/{$old->id}/rotate", [
                'user_id' => $newUser->id,
                'started_at' => today()->toDateString(),
            ])
            ->assertOk()
            ->assertJsonPath('data.new_official.user_id', $newUser->id)
            ->assertJsonPath('warnings', []);
    }
}
