<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Official;
use App\Models\Rt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class LetterControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_creates_letter_for_authenticated_citizen_user(): void
    {
        Notification::fake();

        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        Official::factory()->create(['rt_id' => $rt->id, 'position' => 'rt', 'is_active' => true]);
        $letterType = LetterType::factory()->create();
        $user = User::factory()->create([
            'citizen_id' => $citizen->id,
            'village_id' => $citizen->village_id,
        ]);


        $this->actingAs($user)
            ->postJson('/api/letters', [
                'letter_type_id' => $letterType->id,
                'purpose' => 'Keperluan administrasi',
            ])
            ->assertCreated()
            ->assertJsonPath('message', 'Permohonan berhasil dibuat.')
            ->assertJsonPath('data.status', 'pending');
    }

    public function test_index_returns_letters_scoped_to_user(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        Letter::factory()->count(2)->create();

        $this->actingAs($user)
            ->getJson('/api/letters')
            ->assertOk()
            ->assertJsonPath('message', 'Daftar surat berhasil diambil.')
            ->assertJsonCount(2, 'data');
    }

    public function test_show_returns_letter_detail(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();

        $this->actingAs($user)
            ->getJson("/api/letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $letter->id);
    }

    public function test_destroy_deletes_letter_for_owner(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create(['submitted_by' => $user->id]);

        $this->actingAs($user)
            ->deleteJson("/api/letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Surat berhasil dihapus.');

        $this->assertDatabaseMissing('letters', ['id' => $letter->id]);
    }

    public function test_destroy_forbidden_for_unrelated_user(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create(['role' => 'warga']);
        $letter = Letter::factory()->create(['submitted_by' => $owner->id]);

        $this->actingAs($stranger)
            ->deleteJson("/api/letters/{$letter->id}")
            ->assertStatus(403);
    }
}
