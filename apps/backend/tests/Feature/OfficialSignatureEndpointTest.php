<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Official;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class OfficialSignatureEndpointTest extends TestCase
{
    use RefreshDatabase;

    private function headOfVillage(Village $village, array $attributes = []): Official
    {
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);

        return Official::factory()->create([
            'citizen_id' => $citizen->id,
            'village_id' => $village->id,
            'position' => 'kepala_desa',
            'is_active' => true,
            'ended_at' => null,
            ...$attributes,
        ]);
    }

    private function petugas(Village $village, string $role = 'petugas_desa'): User
    {
        return User::factory()->create(['village_id' => $village->id, 'role' => $role]);
    }

    #[Test]
    public function petugas_can_upload_and_preview_current_village_head_signature(): void
    {
        Storage::fake('private_uploads');
        $village = Village::factory()->create();
        $official = $this->headOfVillage($village);
        $user = $this->petugas($village);

        $this->actingAs($user)
            ->post("/api/officials/{$official->id}/signature", [
                'signature' => UploadedFile::fake()->image('signature.png'),
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Tanda tangan Kepala Desa berhasil diperbarui.')
            ->assertJsonPath('data.has_signature_img', true)
            ->assertJsonMissingPath('data.signature_img');

        $path = $official->fresh()->signature_img;
        $this->assertStringStartsWith("official-signatures/{$village->id}/{$official->id}/", $path);
        Storage::disk('private_uploads')->assertExists($path);

        $this->actingAs($user)
            ->get("/api/officials/{$official->id}/signature")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertHeader('Cache-Control', 'no-store, private');
    }

    #[Test]
    public function replacing_signature_deletes_previous_private_file(): void
    {
        Storage::fake('private_uploads');
        $village = Village::factory()->create();
        $official = $this->headOfVillage($village);
        $user = $this->petugas($village);

        $this->actingAs($user)->post("/api/officials/{$official->id}/signature", [
            'signature' => UploadedFile::fake()->image('first.png'),
        ])->assertOk();
        $firstPath = $official->fresh()->signature_img;

        $this->actingAs($user)->post("/api/officials/{$official->id}/signature", [
            'signature' => UploadedFile::fake()->image('second.png'),
        ])->assertOk();

        Storage::disk('private_uploads')->assertMissing($firstPath);
        Storage::disk('private_uploads')->assertExists($official->fresh()->signature_img);
    }

    #[Test]
    public function guest_non_petugas_and_other_village_cannot_access_signature(): void
    {
        Storage::fake('private_uploads');
        $village = Village::factory()->create();
        $official = $this->headOfVillage($village);

        $this->post("/api/officials/{$official->id}/signature", [
            'signature' => UploadedFile::fake()->image('signature.png'),
        ])->assertUnauthorized();
        $this->get("/api/officials/{$official->id}/signature")->assertUnauthorized();

        $this->actingAs($this->petugas($village, 'warga'))
            ->get("/api/officials/{$official->id}/signature")
            ->assertForbidden();

        $this->actingAs($this->petugas(Village::factory()->create()))
            ->get("/api/officials/{$official->id}/signature")
            ->assertNotFound();
    }

    #[Test]
    public function only_active_incumbent_village_head_can_upload_or_preview(): void
    {
        Storage::fake('private_uploads');
        $village = Village::factory()->create();
        $user = $this->petugas($village);
        $inactiveHead = $this->headOfVillage($village, ['is_active' => false]);
        $endedHead = $this->headOfVillage($village, ['ended_at' => today()]);
        $otherOfficial = $this->headOfVillage($village, ['position' => 'sekdes']);

        foreach ([$inactiveHead, $endedHead, $otherOfficial] as $official) {
            $this->actingAs($user)->post("/api/officials/{$official->id}/signature", [
                'signature' => UploadedFile::fake()->image('signature.png'),
            ])->assertNotFound();
            $this->actingAs($user)->get("/api/officials/{$official->id}/signature")->assertNotFound();
        }
    }

    #[Test]
    public function invalid_signature_file_is_rejected_and_missing_preview_is_not_found(): void
    {
        Storage::fake('private_uploads');
        $village = Village::factory()->create();
        $official = $this->headOfVillage($village);
        $user = $this->petugas($village);

        $this->actingAs($user)->post("/api/officials/{$official->id}/signature", [
            'signature' => UploadedFile::fake()->create('signature.txt', 10, 'text/plain'),
        ])->assertUnprocessable()->assertJsonValidationErrors(['signature']);

        $this->actingAs($user)->get("/api/officials/{$official->id}/signature")->assertNotFound();
    }

    #[Test]
    public function signature_upload_is_rejected_for_an_inactive_petugas_account(): void
    {
        Storage::fake('private_uploads');
        $village = Village::factory()->create();
        $official = $this->headOfVillage($village);
        $user = User::factory()->create([
            'village_id' => $village->id,
            'role' => 'petugas_desa',
            'is_active' => false,
        ]);

        $this->actingAs($user)->post("/api/officials/{$official->id}/signature", [
            'signature' => UploadedFile::fake()->image('signature.png'),
        ])->assertForbidden();
    }
}
