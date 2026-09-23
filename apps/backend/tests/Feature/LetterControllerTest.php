<?php

namespace Tests\Feature;

use App\Models\ApprovalFlow;
use App\Models\Citizen;
use App\Models\FlowStep;
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
        $letter = Letter::factory()->create(['submitted_by' => $user->id]);

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

    public function test_destroy_allowed_for_authorized_staff_role(): void
    {
        $owner = User::factory()->create();
        $staff = User::factory()->create(['role' => 'kasi_pelayanan']);
        $letter = Letter::factory()->create(['submitted_by' => $owner->id]);

        $this->actingAs($staff)
            ->deleteJson("/api/letters/{$letter->id}")
            ->assertOk();

        $this->assertDatabaseMissing('letters', ['id' => $letter->id]);
    }

    public function test_index_requires_authentication(): void
    {
        $this->getJson('/api/letters')->assertUnauthorized();
    }

    /**
     * EV5-4-S7. RT sekarang hanya melihat surat yang SEDANG berada di
     * step 'rt' miliknya - bukan seluruh riwayat surat warga di RT-nya
     * seperti implementasi lama.
     */
    public function test_index_for_rt_only_shows_letters_currently_at_rt_step(): void
    {
        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 1,
            'approver_position' => 'rt',
        ]);

        $letter = Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'citizen_id' => $citizen->id,
        ]);

        // surat lain punya citizen di RT yang sama tapi tidak
        // berhubungan dengan flow/step ini sama sekali - tidak boleh
        // ikut muncul.
        Letter::factory()->create(['citizen_id' => $citizen->id]);

        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);
        $user = User::factory()->create(['role' => 'rt']);
        $user->official()->save($official);

        $this->actingAs($user->fresh())
            ->getJson('/api/letters')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $letter->id);
    }

    public function test_index_forbidden_for_kadus_role(): void
    {
        Letter::factory()->count(2)->create();
        $user = User::factory()->create(['role' => 'kadus']);

        $this->actingAs($user)
            ->getJson('/api/letters')
            ->assertStatus(403);
    }

    public function test_show_returns_404_for_unknown_letter(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/letters/999999')
            ->assertNotFound();
    }
}
