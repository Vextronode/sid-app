<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RwFyiControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_letters_for_rw(): void
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);
        Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'in_progress']);
        Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'approved']);
        Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'rejected']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->getJson('/api/rw/letters')
            ->assertOk()
            ->assertJsonPath('message', 'Riwayat surat FYI RW berhasil diambil.')
            ->assertJsonCount(4, 'data');
    }

    public function test_index_requires_authentication(): void
    {
        $this->getJson('/api/rw/letters')->assertUnauthorized();
    }

    public function test_index_excludes_letters_outside_rw(): void
    {
        $rw = Rw::factory()->create();
        $otherRw = Rw::factory()->create();
        $otherRt = Rt::factory()->create(['rw_id' => $otherRw->id]);
        $otherCitizen = Citizen::factory()->create(['rt_id' => $otherRt->id]);
        Letter::factory()->create(['citizen_id' => $otherCitizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->getJson('/api/rw/letters')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_show_returns_letter_detail_within_rw_scope(): void
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->getJson("/api/rw/letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Detail surat berhasil diambil.')
            ->assertJsonPath('data.id', $letter->id);
    }

    public function test_show_forbidden_for_letter_outside_rw(): void
    {
        $rw = Rw::factory()->create();
        $otherRw = Rw::factory()->create();
        $otherRt = Rt::factory()->create(['rw_id' => $otherRw->id]);
        $otherCitizen = Citizen::factory()->create(['rt_id' => $otherRt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $otherCitizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->getJson("/api/rw/letters/{$letter->id}")
            ->assertStatus(403);
    }

    public function test_show_requires_authentication(): void
    {
        $letter = Letter::factory()->create();

        $this->getJson("/api/rw/letters/{$letter->id}")->assertUnauthorized();
    }

    /**
     * Bukti eksplisit bahwa RW tidak punya kemampuan approve APAPUN:
     * route PATCH /rw/approvals/{letter}/approve sudah dihapus total
     * dari routes/api.php, bukan sekadar dijaga otorisasi. Laravel
     * mengembalikan 404 untuk method+path yang tidak terdaftar sama
     * sekali.
     */
    public function test_approve_route_no_longer_exists(): void
    {
        $letter = Letter::factory()->create();
        $official = Official::factory()->create(['position' => 'rw']);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->patchJson("/api/rw/approvals/{$letter->id}/approve", ['status' => 'approved'])
            ->assertNotFound();
    }
}
