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

    public function test_index_sends_the_category_used_to_group_the_letter_type_choices(): void
    {
        LetterType::factory()->create(['template' => 'tpl', 'name' => 'Surat A']);
        LetterType::factory()->create(['template' => 'tpl', 'name' => 'Surat B', 'category' => 'pelayanan']);

        $this->actingAs(User::factory()->create())
            ->getJson('/api/letter-types')
            ->assertOk()
            ->assertJsonPath('data.0.category', 'persuratan')
            ->assertJsonPath('data.0.category_label', 'Persuratan Desa')
            ->assertJsonPath('data.1.category', 'pelayanan')
            ->assertJsonPath('data.1.category_label', 'Layanan Kependudukan');
    }

    public function test_staf_changes_the_category_and_the_handler_follows_it(): void
    {
        $letterType = LetterType::factory()->create(['template' => 'tpl', 'assigned_role' => 'kaur_tu_umum']);
        $staf = User::factory()->create(['role' => 'staf_sid']);

        $this->actingAs($staf)
            ->putJson("/api/letter-types/{$letterType->id}", ['category' => 'pelayanan'])
            ->assertOk()
            ->assertJsonPath('data.category', 'pelayanan')
            ->assertJsonPath('data.assigned_role', 'kasi_pemerintahan');

        // Pilihan jenis surat ikut berpindah kelompok.
        $this->actingAs(User::factory()->create())
            ->getJson('/api/letter-types')
            ->assertJsonPath('data.0.category_label', 'Layanan Kependudukan');

        $this->actingAs($staf)
            ->putJson("/api/letter-types/{$letterType->id}", ['category' => 'persuratan'])
            ->assertJsonPath('data.assigned_role', 'kaur_tu_umum');
        $this->actingAs($staf)
            ->putJson("/api/letter-types/{$letterType->id}", ['category' => 'lainnya'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('category');
    }

    public function test_index_with_include_inactive_returns_all_types_for_staf_sid(): void
    {
        $admin = User::factory()->create(['role' => 'staf_sid']);
        LetterType::factory()->create(['is_active' => true, 'template' => 'tpl', 'name' => 'Surat A']);
        LetterType::factory()->create(['is_active' => false, 'template' => 'tpl', 'name' => 'Surat B']);
        LetterType::factory()->create(['is_active' => false, 'template' => null, 'name' => 'Surat C']);

        $this->actingAs($admin)
            ->getJson('/api/letter-types?include_inactive=1')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.status_label', 'aktif')
            ->assertJsonPath('data.1.status_label', 'dinonaktifkan')
            ->assertJsonPath('data.2.status_label', 'draft');
    }

    public function test_index_with_include_inactive_forbidden_for_non_staf_sid(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'warga']))
            ->getJson('/api/letter-types?include_inactive=true')
            ->assertForbidden();
    }

    public function test_index_with_include_inactive_false_is_allowed_for_any_role(): void
    {
        LetterType::factory()->create(['is_active' => true, 'template' => 'tpl']);

        $this->actingAs(User::factory()->create(['role' => 'warga']))
            ->getJson('/api/letter-types?include_inactive=0')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_reactivated_letter_type_returns_to_default_list(): void
    {
        $admin = User::factory()->create(['role' => 'staf_sid']);
        $letterType = LetterType::factory()->create(['is_active' => false, 'template' => 'tpl']);

        $this->actingAs($admin)
            ->putJson("/api/letter-types/{$letterType->id}", ['is_active' => true])
            ->assertOk()
            ->assertJsonPath('data.status_label', 'aktif');

        $this->actingAs($admin)
            ->getJson('/api/letter-types')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $letterType->id);
    }

    public function test_update_rejects_activating_draft_letter_type(): void
    {
        $admin = User::factory()->create(['role' => 'staf_sid']);
        $letterType = LetterType::factory()->create(['is_active' => false, 'template' => null]);

        $this->actingAs($admin)
            ->putJson("/api/letter-types/{$letterType->id}", ['is_active' => true])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['is_active']);

        $this->assertDatabaseHas('letter_types', ['id' => $letterType->id, 'is_active' => false]);
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

    public function test_handler_cannot_be_set_apart_from_the_category(): void
    {
        $admin = User::factory()->create(['role' => 'staf_sid']);
        $letterType = LetterType::factory()->create(['assigned_role' => 'kasi_pemerintahan']);

        $this->actingAs($admin)
            ->putJson("/api/letter-types/{$letterType->id}", ['assigned_role' => 'kaur_tu_umum'])
            ->assertOk()
            ->assertJsonPath('data.assigned_role', 'kasi_pemerintahan');
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
