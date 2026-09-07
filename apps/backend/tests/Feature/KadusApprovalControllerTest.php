<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class KadusApprovalControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_letters_for_own_hamlet(): void
    {
        $hamlet = Hamlet::factory()->create();
        $citizen = Citizen::factory()->create(['hamlet_id' => $hamlet->id]);
        Letter::factory()->create(['citizen_id' => $citizen->id]);

        $official = Official::factory()->create(['position' => 'kadus', 'hamlet_id' => $hamlet->id]);
        $user = User::factory()->create(['role' => 'kadus']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->getJson('/api/kadus/letters')
            ->assertOk()
            ->assertJsonCount(1, 'data.data');
    }

    public function test_decision_approve_marks_letter_kadus_approved(): void
    {
        Notification::fake();

        $hamlet = Hamlet::factory()->create();
        $citizen = Citizen::factory()->create(['hamlet_id' => $hamlet->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'kadus', 'hamlet_id' => $hamlet->id]);
        $user = User::factory()->create(['role' => 'kadus']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->patchJson("/api/kadus/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('message', 'Surat berhasil diproses.');

        $this->assertDatabaseHas('letters', ['id' => $letter->id, 'status' => 'kadus_approved']);
    }

    public function test_show_returns_letter_detail(): void
    {
        $hamlet = Hamlet::factory()->create();
        $citizen = Citizen::factory()->create(['hamlet_id' => $hamlet->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id]);

        $official = Official::factory()->create(['position' => 'kadus', 'hamlet_id' => $hamlet->id]);
        $user = User::factory()->create(['role' => 'kadus']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->getJson("/api/kadus/letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $letter->id);
    }
}
