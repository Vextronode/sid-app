<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Official;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KasiLetterControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lists_only_approved_letters_assigned_to_role(): void
    {
        $village = Village::factory()->create();
        $user = $this->makeUserWithPosition('kasi_pelayanan', $village);
        $allowed = $this->makeLetter($village, 'approved', 'kasi_pelayanan');
        $this->makeLetter($village, 'approved', 'kaur_tu_umum');
        $this->makeLetter($village, 'pending', 'kasi_pelayanan');

        $this->actingAs($user)
            ->getJson('/api/kasi/letters')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $allowed->id);
    }

    public function test_index_allows_unassigned_approved_letters_for_kasi_and_kaur(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetter($village, 'approved', null);

        foreach (['kasi_pelayanan', 'kaur_tu_umum'] as $position) {
            $user = $this->makeUserWithPosition($position, $village);

            $this->actingAs($user)
                ->getJson('/api/kasi/letters')
                ->assertOk()
                ->assertJsonCount(1, 'data')
                ->assertJsonPath('data.0.id', $letter->id);
        }
    }

    public function test_index_requires_authentication_and_kasi_or_kaur_role(): void
    {
        $this->getJson('/api/kasi/letters')->assertUnauthorized();

        $rt = User::factory()->create(['role' => 'rt']);
        $this->actingAs($rt)->getJson('/api/kasi/letters')->assertForbidden();
    }

    public function test_show_returns_approved_letter_detail(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetter($village, 'approved', 'kasi_pelayanan');
        $user = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->actingAs($user)
            ->getJson("/api/kasi/letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $letter->id);
    }

    public function test_show_forbids_pending_wrong_village_and_wrong_assigned_role(): void
    {
        $village = Village::factory()->create();
        $user = $this->makeUserWithPosition('kasi_pelayanan', $village);
        $pending = $this->makeLetter($village, 'pending', 'kasi_pelayanan');
        $wrongRole = $this->makeLetter($village, 'approved', 'kaur_tu_umum');
        $otherVillage = $this->makeLetter(Village::factory()->create(), 'approved', 'kasi_pelayanan');

        foreach ([$pending, $wrongRole, $otherVillage] as $letter) {
            $this->actingAs($user)
                ->getJson("/api/kasi/letters/{$letter->id}")
                ->assertForbidden();
        }
    }

    public function test_kasi_letter_endpoint_is_read_only(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetter($village, 'approved', 'kasi_pelayanan');
        $user = $this->makeUserWithPosition('kasi_pelayanan', $village);

        $this->actingAs($user)
            ->patchJson("/api/kasi/letters/{$letter->id}", ['status' => 'approved'])
            ->assertMethodNotAllowed();
    }

    private function makeUserWithPosition(string $position, Village $village): User
    {
        $user = User::factory()->create([
            'role' => $position,
            'village_id' => $village->id,
        ]);
        Official::factory()->create([
            'user_id' => $user->id,
            'position' => $position,
            'village_id' => $village->id,
            'is_active' => true,
        ]);

        return $user;
    }

    private function makeLetter(Village $village, string $status, ?string $assignedRole): Letter
    {
        $letterType = LetterType::factory()->create(['assigned_role' => $assignedRole]);

        return Letter::factory()->create([
            'village_id' => $village->id,
            'letter_type_id' => $letterType->id,
            'status' => $status,
        ]);
    }
}
