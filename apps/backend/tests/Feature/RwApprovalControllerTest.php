<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RwApprovalControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_pending_letters_for_rw(): void
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'rt_approved']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->getJson('/api/rw/letters')
            ->assertOk()
            ->assertJsonPath('message', 'Daftar surat RW berhasil diambil.')
            ->assertJsonCount(1, 'data');
    }

    public function test_approve_without_pending_rw_approval_succeeds(): void
    {
        Notification::fake();

        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'rt_approved']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->patchJson("/api/rw/approvals/{$letter->id}/approve", ['status' => 'approved'])
            ->assertOk();

        $this->assertDatabaseHas('letters', ['id' => $letter->id, 'status' => 'rw_approved']);
    }

    public function test_show_returns_letter_detail(): void
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'rt_approved']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->getJson("/api/rw/letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $letter->id);
    }
}
