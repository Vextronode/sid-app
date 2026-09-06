<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class KasiApprovalControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_plain_array_without_data_wrapper(): void
    {
        $user = User::factory()->create(['role' => 'kasi_pelayanan']);
        Letter::factory()->count(2)->create();

        $response = $this->actingAs($user)
            ->getJson('/api/kasi/letters')
            ->assertOk();

        // Catatan: kontrak asli mengembalikan array polos di root JSON
        // (bukan {data: [...]}) - dipastikan tetap begitu setelah refactor.
        $response->assertJsonStructure(['*' => ['id']]);
        $this->assertCount(2, $response->json());
    }

    public function test_approve_marks_letter_kasi_approved(): void
    {
        Notification::fake();

        $letter = Letter::factory()->create(['status' => 'rw_approved']);
        $user = User::factory()->create(['role' => 'kasi_pelayanan']);

        $this->actingAs($user)
            ->patchJson("/api/kasi/approvals/{$letter->id}/approve", ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('message', 'Approval berhasil diproses.');

        $this->assertDatabaseHas('letters', ['id' => $letter->id, 'status' => 'kasi_approved']);
    }

    public function test_show_returns_letter_detail(): void
    {
        $letter = Letter::factory()->create();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson("/api/kasi/letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $letter->id);
    }
}
