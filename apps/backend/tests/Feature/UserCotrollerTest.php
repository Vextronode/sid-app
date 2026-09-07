<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Official;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserCotrollerTest extends TestCase
{
    use RefreshDatabase;

    private function seedActiveVillageHead(): void
    {
        $citizen = Citizen::factory()->create();
        Official::factory()->create([
            'position' => 'kepala_desa',
            'citizen_id' => $citizen->id,
            'is_active' => true,
            'ended_at' => null,
        ]);
    }

    public function test_download_returns_pdf_when_letter_approved(): void
    {
        $this->seedActiveVillageHead();

        $letterType = LetterType::factory()->create(['template' => 'Isi surat {{ applicant_name }}']);
        $letter = Letter::factory()->create([
            'status' => 'kasi_approved',
            'letter_type_id' => $letterType->id,
            'expires_at' => now()->addDays(10),
        ]);
        $user = User::factory()->create(['role' => 'petugas_desa']);

        $response = $this->actingAs($user)->get("/api/letters/{$letter->id}/download");

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
    }

    public function test_download_forbidden_when_not_yet_approved(): void
    {
        $letter = Letter::factory()->create(['status' => 'pending']);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get("/api/letters/{$letter->id}/download")
            ->assertStatus(403);
    }

    public function test_preview_returns_pdf_stream(): void
    {
        $this->seedActiveVillageHead();

        $letterType = LetterType::factory()->create(['template' => 'Isi surat {{ applicant_name }}']);
        $letter = Letter::factory()->create([
            'letter_type_id' => $letterType->id,
        ]);
        $user = User::factory()->create(['role' => 'petugas_desa']);

        $response = $this->actingAs($user)->get("/api/letters/{$letter->id}/preview");

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
    }
}
