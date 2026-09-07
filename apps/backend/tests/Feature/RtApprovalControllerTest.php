<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RtApprovalControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_pending_letters_for_rt(): void
    {
        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id]);
        $user = User::factory()->create(['role' => 'rt']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->getJson('/api/rt/letters')
            ->assertOk()
            ->assertJsonPath('message', 'Daftar surat RT berhasil diambil.')
            ->assertJsonCount(1, 'data');
    }

    public function test_decision_approve_marks_letter_rt_approved(): void
    {
        Notification::fake();

        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id]);
        $user = User::factory()->create(['role' => 'rt']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->patchJson("/api/rt/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('message', 'Surat berhasil diproses.');

        $this->assertDatabaseHas('letters', ['id' => $letter->id, 'status' => 'rt_approved']);
    }

    public function test_decision_reject_requires_notes(): void
    {
        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id]);
        $user = User::factory()->create(['role' => 'rt']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->patchJson("/api/rt/letters/{$letter->id}/decision", ['status' => 'rejected'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('notes');
    }

    public function test_show_returns_letter_detail_with_relations(): void
    {
        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id]);

        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id]);
        $user = User::factory()->create(['role' => 'rt']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->getJson("/api/rt/letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $letter->id);
    }
}
