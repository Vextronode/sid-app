<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-8-S1 — Feature test untuk GET/PATCH /villages/profile (UC-18).
 *
 * Cakupan kondisi:
 *  - GET /villages/profile butuh login (401 untuk guest).
 *  - GET /villages/profile mengembalikan profil desa milik user yang login.
 *  - PATCH /villages/profile sukses (200) untuk petugas_desa dengan payload valid.
 *  - PATCH /villages/profile ditolak (403) untuk role selain petugas_desa
 *    (termasuk kepala_desa/sekretaris_desa - SID-ARCH-SYS-001 S2.3).
 *  - PATCH /villages/profile gagal validasi (422) jika name/head_name kosong.
 */
class VillageProfileEndpointTest extends TestCase
{
    use RefreshDatabase;

    private function villageWithUser(string $role = 'petugas_desa'): array
    {
        $village = Village::create([
            'name' => 'Desa Cibenda',
            'code' => 'CBD',
            'head_name' => 'H. Ridwan Saepudin',
        ]);

        $user = User::factory()->create([
            'village_id' => $village->id,
            'role' => $role,
        ]);

        return [$village, $user];
    }

    #[Test]
    public function guest_cannot_view_village_profile(): void
    {
        $response = $this->getJson('/api/villages/profile');

        $response->assertStatus(401);
    }

    #[Test]
    public function authenticated_user_can_view_village_profile(): void
    {
        [$village, $user] = $this->villageWithUser();

        $response = $this->actingAs($user)->getJson('/api/villages/profile');

        $response->assertOk()
            ->assertJsonPath('data.id', $village->id)
            ->assertJsonPath('data.name', 'Desa Cibenda');
    }

    #[Test]
    public function petugas_desa_can_update_village_profile(): void
    {
        [, $user] = $this->villageWithUser();

        $response = $this->actingAs($user)->patchJson('/api/villages/profile', [
            'name' => 'Desa Cibenda Baru',
            'head_name' => 'H. Ridwan Saepudin',
            'vision' => 'Menjadi desa mandiri, maju, dan sejahtera',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Desa Cibenda Baru')
            ->assertJsonPath('data.vision', 'Menjadi desa mandiri, maju, dan sejahtera')
            ->assertJsonPath('data.has_stamp_img', false);
    }

    #[Test]
    public function petugas_can_upload_and_preview_private_village_stamp(): void
    {
        Storage::fake('private_uploads');
        [$village, $user] = $this->villageWithUser();

        $upload = $this->actingAs($user)->post('/api/villages/profile/stamp', [
            'stamp' => UploadedFile::fake()->image('stamp.png'),
        ]);

        $upload->assertOk()
            ->assertJsonPath('message', 'Stempel desa berhasil diperbarui.')
            ->assertJsonPath('data.has_stamp_img', true)
            ->assertJsonMissingPath('data.stamp_img');

        $path = $village->fresh()->stamp_img;
        $this->assertStringStartsWith("village-stamps/{$village->id}/", $path);
        Storage::disk('private_uploads')->assertExists($path);

        $this->actingAs($user)->get('/api/villages/profile/stamp')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertHeader('Cache-Control', 'no-store, private');
    }

    #[Test]
    public function replacing_stamp_removes_previous_private_file(): void
    {
        Storage::fake('private_uploads');
        [$village, $user] = $this->villageWithUser();

        $this->actingAs($user)->post('/api/villages/profile/stamp', [
            'stamp' => UploadedFile::fake()->image('first.png'),
        ])->assertOk();
        $firstPath = $village->fresh()->stamp_img;

        $this->actingAs($user)->post('/api/villages/profile/stamp', [
            'stamp' => UploadedFile::fake()->image('second.png'),
        ])->assertOk();

        Storage::disk('private_uploads')->assertMissing($firstPath);
        Storage::disk('private_uploads')->assertExists($village->fresh()->stamp_img);
    }

    #[Test]
    public function guest_and_non_petugas_cannot_upload_or_preview_stamp(): void
    {
        Storage::fake('private_uploads');
        [, $user] = $this->villageWithUser();

        $this->post('/api/villages/profile/stamp', [
            'stamp' => UploadedFile::fake()->image('stamp.png'),
        ])->assertUnauthorized();
        $this->get('/api/villages/profile/stamp')->assertUnauthorized();

        $otherUser = User::factory()->create(['village_id' => $user->village_id, 'role' => 'warga']);
        $this->actingAs($otherUser)->post('/api/villages/profile/stamp', [
            'stamp' => UploadedFile::fake()->image('stamp.png'),
        ])->assertForbidden();
        $this->actingAs($otherUser)->get('/api/villages/profile/stamp')->assertForbidden();
    }

    #[Test]
    public function profile_update_does_not_accept_stamp_path_and_missing_stamp_preview_is_404(): void
    {
        Storage::fake('private_uploads');
        [$village, $user] = $this->villageWithUser();

        $this->actingAs($user)->patchJson('/api/villages/profile', [
            'name' => 'Desa Cibenda',
            'head_name' => 'Kepala Desa',
            'stamp_img' => 'outside/path.png',
        ])->assertOk()->assertJsonPath('data.has_stamp_img', false);

        $this->assertNull($village->fresh()->stamp_img);
        $this->actingAs($user)->get('/api/villages/profile/stamp')->assertNotFound();
    }

    #[Test]
    public function kepala_desa_cannot_update_village_profile(): void
    {
        [, $user] = $this->villageWithUser('kepala_desa');

        $response = $this->actingAs($user)->patchJson('/api/villages/profile', [
            'name' => 'Desa Cibenda Baru',
            'head_name' => 'H. Ridwan Saepudin',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function updating_village_profile_without_required_fields_fails_validation(): void
    {
        [, $user] = $this->villageWithUser();

        $response = $this->actingAs($user)->patchJson('/api/villages/profile', [
            'address' => 'Jl. Raya Cibenda No. 1',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'head_name']);
    }
}
