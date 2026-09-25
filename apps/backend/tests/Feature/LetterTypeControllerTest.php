<?php

namespace Tests\Feature;

use App\Models\ApprovalFlow;
use App\Models\LetterCategory;
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
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $letterType = LetterType::factory()->create(['validity_days' => 30, 'is_active' => true]);

        $this->actingAs($admin)
            ->patchJson("/api/letter-types/{$letterType->id}", [
                'validity_days' => 180,
                'is_active' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.validity_days', 180)
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('letter_types', ['id' => $letterType->id, 'validity_days' => 180, 'is_active' => false]);
    }

    public function test_update_moves_letter_type_to_another_flow_in_the_same_category(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $category = LetterCategory::factory()->create();
        $oldFlow = ApprovalFlow::factory()->create(['category_id' => $category->id]);
        $newFlow = ApprovalFlow::factory()->create(['category_id' => $category->id]);
        $letterType = LetterType::factory()->create(['category_id' => $category->id, 'flow_id' => $oldFlow->id]);

        $this->actingAs($admin)
            ->patchJson("/api/letter-types/{$letterType->id}", ['flow_id' => $newFlow->id])
            ->assertOk()
            ->assertJsonPath('data.flow_id', $newFlow->id);
    }

    public function test_update_rejects_flow_from_a_different_category(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $category = LetterCategory::factory()->create();
        $otherCategory = LetterCategory::factory()->create();
        $flowInOtherCategory = ApprovalFlow::factory()->create(['category_id' => $otherCategory->id]);
        $letterType = LetterType::factory()->create(['category_id' => $category->id]);

        $this->actingAs($admin)
            ->patchJson("/api/letter-types/{$letterType->id}", ['flow_id' => $flowInOtherCategory->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['flow_id']);
    }

    public function test_update_rejects_non_positive_validity_days(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $letterType = LetterType::factory()->create();

        $this->actingAs($admin)
            ->patchJson("/api/letter-types/{$letterType->id}", ['validity_days' => -5])
            ->assertStatus(422)
            ->assertJsonPath('errors.validity_days.0', 'Masa berlaku harus lebih dari 0 hari');
    }

    public function test_update_forbidden_for_non_petugas_desa(): void
    {
        $letterType = LetterType::factory()->create();

        $this->actingAs(User::factory()->create(['role' => 'rt']))
            ->patchJson("/api/letter-types/{$letterType->id}", ['validity_days' => 60])
            ->assertStatus(403);
    }

    public function test_update_requires_authentication(): void
    {
        $letterType = LetterType::factory()->create();

        $this->patchJson("/api/letter-types/{$letterType->id}", ['validity_days' => 60])
            ->assertUnauthorized();
    }

    public function test_update_returns_404_for_unknown_letter_type(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);

        $this->actingAs($admin)
            ->patchJson('/api/letter-types/999999', ['validity_days' => 60])
            ->assertNotFound();
    }
}
