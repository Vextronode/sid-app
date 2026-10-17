<?php

namespace Tests\Feature;

use App\Models\LetterType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * EV5-12-S1. PATCH /letter-types/{id} sesuai
 * paths/letter-types/letter-type-detail.yaml.
 */
class LetterTypeControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_only_active_letter_types_with_template(): void
    {
        $user = User::factory()->create();
        LetterType::factory()->create(['is_active' => true, 'template' => 'tpl', 'name' => 'Surat A']);
        LetterType::factory()->create(['is_active' => false, 'template' => 'tpl', 'name' => 'Surat B']);

        $this->actingAs($user)
            ->getJson('/api/letter-types')
            ->assertOk()
            ->assertJsonPath('message', 'Daftar jenis surat berhasil diambil.')
            ->assertJsonCount(1, 'data');
    }

    public function test_update_changes_validity_days_and_toggles_active(): void
    {
        $admin = User::factory()->create(['role' => 'staf_sid']);
        $letterType = LetterType::factory()->create(['validity_days' => 30, 'is_active' => true]);

        $this->actingAs($admin)
            ->putJson("/api/letter-types/{$letterType->id}", [
                'validity_days' => 180,
                'is_active' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.validity_days', 180)
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('letter_types', ['id' => $letterType->id, 'validity_days' => 180, 'is_active' => false]);
    }

    public function test_update_accepts_null_assigned_role_for_letters_available_to_both_roles(): void
    {
        $admin = User::factory()->create(['role' => 'staf_sid']);
        $letterType = LetterType::factory()->create(['assigned_role' => 'kasi_pelayanan']);

        $this->actingAs($admin)
            ->putJson("/api/letter-types/{$letterType->id}", ['assigned_role' => null])
            ->assertOk()
            ->assertJsonPath('data.assigned_role', null);

        $this->assertDatabaseHas('letter_types', [
            'id' => $letterType->id,
            'assigned_role' => null,
        ]);
    }

    public function test_update_rejects_non_positive_validity_days(): void
    {
        $admin = User::factory()->create(['role' => 'staf_sid']);
        $letterType = LetterType::factory()->create();

        $this->actingAs($admin)
            ->putJson("/api/letter-types/{$letterType->id}", ['validity_days' => -5])
            ->assertStatus(422)
            ->assertJsonPath('errors.validity_days.0', 'Masa berlaku harus lebih dari 0 hari');
    }

    public function test_update_forbidden_for_non_staf_sid(): void
    {
        $letterType = LetterType::factory()->create();

        $this->actingAs(User::factory()->create(['role' => 'rt']))
            ->putJson("/api/letter-types/{$letterType->id}", ['validity_days' => 60])
            ->assertStatus(403);
    }

    public function test_update_requires_authentication(): void
    {
        $letterType = LetterType::factory()->create();

        $this->putJson("/api/letter-types/{$letterType->id}", ['validity_days' => 60])
            ->assertUnauthorized();
    }

    public function test_update_returns_404_for_unknown_letter_type(): void
    {
        $admin = User::factory()->create(['role' => 'staf_sid']);

        $this->actingAs($admin)
            ->putJson('/api/letter-types/999999', ['validity_days' => 60])
            ->assertNotFound();
    }
}
