<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Official;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Download hanya tersedia setelah status surat menjadi approved.
 */
class LetterDownloadControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_download_blocked_when_letter_not_yet_approved(): void
    {
        $letter = Letter::factory()->create(['status' => 'pending']);
        $user = User::factory()->create(['role' => 'petugas_desa']);

        $this->actingAs($user)
            ->getJson("/api/letters/{$letter->id}/download")
            ->assertForbidden();
    }

    public function test_download_succeeds_when_letter_is_approved(): void
    {
        $kadesCitizen = Citizen::factory()->create();
        Official::factory()->create([
            'position' => 'kepala_desa',
            'citizen_id' => $kadesCitizen->id,
            'is_active' => true,
            'ended_at' => null,
        ]);

        $letterType = LetterType::factory()->create(['template' => 'Isi surat {{ applicant_name }}']);
        $letter = Letter::factory()->create([
            'status' => 'approved',
            'letter_type_id' => $letterType->id,
            'expires_at' => now()->addDays(10),
        ]);
        $user = User::factory()->create(['role' => 'petugas_desa']);

        $this->actingAs($user)
            ->get("/api/letters/{$letter->id}/download")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_download_requires_authentication(): void
    {
        $letter = Letter::factory()->create(['status' => 'approved']);

        $this->getJson("/api/letters/{$letter->id}/download")
            ->assertUnauthorized();
    }

    public function test_download_forbids_unrelated_warga_even_when_letter_is_approved(): void
    {
        $owner = User::factory()->create(['role' => 'warga']);
        $stranger = User::factory()->create(['role' => 'warga']);
        $letter = Letter::factory()->create([
            'status' => 'approved',
            'submitted_by' => $owner->id,
        ]);

        $this->actingAs($stranger)
            ->getJson("/api/letters/{$letter->id}/download")
            ->assertForbidden();
    }

    public function test_kasi_can_download_approved_letter_assigned_to_her_role(): void
    {
        $village = Village::factory()->create();
        $kadesCitizen = Citizen::factory()->create(['village_id' => $village->id]);
        Official::factory()->create([
            'position' => 'kepala_desa',
            'village_id' => $village->id,
            'citizen_id' => $kadesCitizen->id,
            'is_active' => true,
            'ended_at' => null,
        ]);
        $kasi = User::factory()->create([
            'role' => 'kasi_pelayanan',
            'village_id' => $village->id,
        ]);
        Official::factory()->forUser($kasi)->position('kasi_pelayanan')->create();
        $letterType = LetterType::factory()->create(['assigned_role' => 'kasi_pelayanan']);
        $letter = Letter::factory()->create([
            'village_id' => $village->id,
            'letter_type_id' => $letterType->id,
            'status' => 'approved',
        ]);

        $this->actingAs($kasi)
            ->get("/api/letters/{$letter->id}/download")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_kasi_cannot_download_letter_assigned_to_another_role(): void
    {
        $village = Village::factory()->create();
        $kasi = User::factory()->create([
            'role' => 'kasi_pelayanan',
            'village_id' => $village->id,
        ]);
        Official::factory()->forUser($kasi)->position('kasi_pelayanan')->create();
        $letterType = LetterType::factory()->create(['assigned_role' => 'kaur_tu_umum']);
        $letter = Letter::factory()->create([
            'village_id' => $village->id,
            'letter_type_id' => $letterType->id,
            'status' => 'approved',
        ]);

        $this->actingAs($kasi)
            ->getJson("/api/letters/{$letter->id}/download")
            ->assertForbidden();
    }

    public function test_applicant_can_download_approved_letter_regardless_of_role(): void
    {
        $village = Village::factory()->create();
        $kadesCitizen = Citizen::factory()->create(['village_id' => $village->id]);
        Official::factory()->create([
            'position' => 'kepala_desa',
            'village_id' => $village->id,
            'citizen_id' => $kadesCitizen->id,
            'is_active' => true,
            'ended_at' => null,
        ]);
        $applicant = User::factory()->create([
            'role' => 'rt',
            'village_id' => $village->id,
        ]);
        $letter = Letter::factory()->create([
            'village_id' => $village->id,
            'submitted_by' => $applicant->id,
            'status' => 'approved',
        ]);

        $this->actingAs($applicant)
            ->get("/api/letters/{$letter->id}/download")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_applicant_cannot_download_letter_that_is_not_approved(): void
    {
        $applicant = User::factory()->create(['role' => 'petugas_desa']);
        $letter = Letter::factory()->create([
            'submitted_by' => $applicant->id,
            'status' => 'pending',
        ]);

        $this->actingAs($applicant)
            ->getJson("/api/letters/{$letter->id}/download")
            ->assertForbidden();
    }

    public function test_preview_forbids_unrelated_warga(): void
    {
        $owner = User::factory()->create(['role' => 'warga']);
        $stranger = User::factory()->create(['role' => 'warga']);
        $letter = Letter::factory()->create([
            'submitted_by' => $owner->id,
        ]);

        $this->actingAs($stranger)
            ->getJson("/api/letters/{$letter->id}/preview")
            ->assertForbidden();
    }
}
