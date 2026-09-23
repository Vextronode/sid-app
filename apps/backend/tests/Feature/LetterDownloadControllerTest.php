<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Official;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * EV5-4-S9. Gate download PDF kini generik (status='approved'), bukan
 * lagi 'kasi_approved' - lihat paths/letters/download.yaml.
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
            ->assertStatus(403)
            ->assertJsonPath('message', 'Surat baru dapat diunduh setelah seluruh proses persetujuan selesai.');
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
