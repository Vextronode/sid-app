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
 *  - PATCH /villages/profile sukses (200) untuk staf_sid dengan payload valid.
 *  - PATCH /villages/profile ditolak (403) untuk role selain staf_sid
 *    (termasuk kepala_desa/sekretaris_desa - SID-ARCH-SYS-001 S2.3).
 *  - PATCH /villages/profile gagal validasi (422) jika name/head_name kosong.
 */
class VillageProfileEndpointTest extends TestCase
{
    use RefreshDatabase;

    private function villageWithUser(string $role = 'staf_sid'): array
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
    public function staf_sid_can_update_village_profile(): void
    {
        [, $user] = $this->villageWithUser();

        $response = $this->actingAs($user)->patchJson('/api/villages/profile', [
            'name' => 'Desa Cibenda Baru',
            'head_name' => 'H. Ridwan Saepudin',
            'vision' => 'Menjadi desa mandiri, maju, dan sejahtera',
            'area_ha' => 759.319,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Desa Cibenda Baru')
            ->assertJsonPath('data.vision', 'Menjadi desa mandiri, maju, dan sejahtera')
            ->assertJsonPath('data.area_ha', 759.319)
            ->assertJsonMissingPath('data.has_stamp_img');
    }

    #[Test]
    public function village_area_is_optional_and_must_be_a_non_negative_number(): void
    {
        [$village, $user] = $this->villageWithUser();
        $payload = ['name' => 'Desa Cibenda', 'head_name' => 'H. Ridwan Saepudin'];

        foreach (['seluas itu', -1] as $invalid) {
            $this->actingAs($user)
                ->patchJson('/api/villages/profile', [...$payload, 'area_ha' => $invalid])
                ->assertStatus(422)
                ->assertJsonValidationErrors(['area_ha']);
        }

        $this->actingAs($user)
            ->patchJson('/api/villages/profile', [...$payload, 'area_ha' => null])
            ->assertOk()
            ->assertJsonPath('data.area_ha', null);
        $this->assertNull($village->fresh()->area_ha);
    }

    #[Test]
    public function dukcapil_area_code_is_optional_and_must_be_eight_digits(): void
    {
        [$village, $user] = $this->villageWithUser();
        $payload = ['name' => 'Desa Cibenda', 'head_name' => 'H. Ridwan Saepudin'];

        foreach (['3218200', '321820081', '3218200A'] as $invalid) {
            $this->actingAs($user)
                ->patchJson('/api/villages/profile', [...$payload, 'area_code' => $invalid])
                ->assertStatus(422)
                ->assertJsonValidationErrors(['area_code']);
        }

        $this->actingAs($user)
            ->patchJson('/api/villages/profile', [...$payload, 'area_code' => '32182008'])
            ->assertOk()
            ->assertJsonPath('data.area_code', '32182008');
        $this->assertSame('32182008', $village->fresh()->area_code);
    }

    #[Test]
    public function village_stamp_is_no_longer_managed_because_letters_are_stamped_by_hand(): void
    {
        [, $user] = $this->villageWithUser();

        // Surat terbit tanpa stempel digital; stempel dibubuhkan basah di kantor desa.
        $this->actingAs($user)->post('/api/villages/profile/stamp', [
            'stamp' => UploadedFile::fake()->image('stamp.png'),
        ])->assertNotFound();
        $this->actingAs($user)->get('/api/villages/profile/stamp')->assertNotFound();
        $this->actingAs($user)->getJson('/api/villages/profile')
            ->assertOk()
            ->assertJsonMissingPath('data.has_stamp_img');
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

    #[Test]
    public function petugas_can_update_public_page_texts(): void
    {
        [$village, $user] = $this->villageWithUser();

        $this->actingAs($user)->patchJson('/api/villages/profile', [
            'name' => 'Desa Cibenda',
            'head_name' => 'H. Ridwan Saepudin',
            'office_hours' => 'Senin – Jumat, 08.00 – 15.00 WIB',
            'latitude' => -7.6803137,
            'longitude' => 108.5513816,
            'hero_photo_credit' => 'Dinas Pariwisata',
            'welcome_message' => 'Selamat datang di situs resmi desa.',
        ])->assertOk()
            ->assertJsonPath('data.welcome_message', 'Selamat datang di situs resmi desa.')
            ->assertJsonPath('data.office_hours', 'Senin – Jumat, 08.00 – 15.00 WIB')
            ->assertJsonPath('data.latitude', -7.6803137)
            ->assertJsonPath('data.longitude', 108.5513816)
            ->assertJsonPath('data.hero_photo_credit', 'Dinas Pariwisata');

        // Field yang tidak dikirim tidak ikut dikosongkan.
        $this->actingAs($user)->patchJson('/api/villages/profile', [
            'name' => 'Desa Cibenda',
            'head_name' => 'H. Ridwan Saepudin',
        ])->assertOk()->assertJsonPath('data.latitude', -7.6803137);

        $this->actingAs($user)->patchJson('/api/villages/profile', [
            'name' => 'Desa Cibenda',
            'head_name' => 'H. Ridwan Saepudin',
            'latitude' => -91,
            'longitude' => 181,
        ])->assertStatus(422)->assertJsonValidationErrors(['latitude', 'longitude']);

        // Koordinat hanya berarti bila keduanya ada.
        $this->actingAs($user)->patchJson('/api/villages/profile', [
            'name' => 'Desa Cibenda',
            'head_name' => 'H. Ridwan Saepudin',
            'latitude' => -7.5,
        ])->assertStatus(422)->assertJsonValidationErrors(['longitude']);

        $this->assertSame(-7.6803137, $village->fresh()->latitude);

        // Lokasi bisa dihapus dengan mengosongkan keduanya.
        $this->actingAs($user)->patchJson('/api/villages/profile', [
            'name' => 'Desa Cibenda',
            'head_name' => 'H. Ridwan Saepudin',
            'latitude' => null,
            'longitude' => null,
        ])->assertOk()
            ->assertJsonPath('data.latitude', null)
            ->assertJsonPath('data.longitude', null);
    }

    #[Test]
    public function seeded_asset_paths_are_returned_as_is(): void
    {
        [$village, $user] = $this->villageWithUser();
        $village->update([
            'logo' => '/assets/image/lambang.webp',
            'hero_image' => 'https://cdn.example.com/hero.jpg',
        ]);

        $this->actingAs($user)->getJson('/api/villages/profile')
            ->assertOk()
            ->assertJsonPath('data.logo_url', '/assets/image/lambang.webp')
            ->assertJsonPath('data.hero_image_url', 'https://cdn.example.com/hero.jpg');
    }

    #[Test]
    public function petugas_can_replace_logo_and_hero_image(): void
    {
        Storage::fake('public');
        [$village, $user] = $this->villageWithUser();
        $village->update(['logo' => '/assets/image/lambang.webp']);

        $first = $this->actingAs($user)->post('/api/villages/profile/logo', [
            'image' => UploadedFile::fake()->image('logo.png'),
        ])->assertOk()->assertJsonPath('message', 'Logo desa berhasil diperbarui.');

        $firstPath = $village->fresh()->logo;
        $this->assertStringStartsWith("village-media/{$village->id}/", $firstPath);
        Storage::disk('public')->assertExists($firstPath);
        $this->assertSame(Storage::disk('public')->url($firstPath), $first->json('data.logo_url'));

        // Unggahan kedua menghapus berkas unggahan sebelumnya.
        $this->actingAs($user)->post('/api/villages/profile/logo', [
            'image' => UploadedFile::fake()->image('logo2.png'),
        ])->assertOk();
        Storage::disk('public')->assertMissing($firstPath);

        $this->actingAs($user)->post('/api/villages/profile/hero-image', [
            'image' => UploadedFile::fake()->image('hero.jpg', 1600, 900),
        ])->assertOk()->assertJsonPath('message', 'Foto beranda berhasil diperbarui.');
        Storage::disk('public')->assertExists($village->fresh()->hero_image);
    }

    #[Test]
    public function image_upload_is_validated_and_limited_to_petugas(): void
    {
        Storage::fake('public');
        [$village, $user] = $this->villageWithUser();

        $this->actingAs($user)->post('/api/villages/profile/logo', [
            'image' => UploadedFile::fake()->create('logo.pdf', 10, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors(['image']);

        // Logo maks 2 MB, foto beranda maks 5 MB.
        $this->actingAs($user)->post('/api/villages/profile/logo', [
            'image' => UploadedFile::fake()->image('logo.png')->size(3000),
        ], ['Accept' => 'application/json'])->assertStatus(422);
        $this->actingAs($user)->post('/api/villages/profile/hero-image', [
            'image' => UploadedFile::fake()->image('hero.png')->size(3000),
        ], ['Accept' => 'application/json'])->assertOk();

        $kades = User::factory()->create(['village_id' => $village->id, 'role' => 'kepala_desa']);
        $this->actingAs($kades)->post('/api/villages/profile/logo', [
            'image' => UploadedFile::fake()->image('logo.png'),
        ], ['Accept' => 'application/json'])->assertStatus(403);
    }

    /** Ukuran [lebar, tinggi] dan tipe berkas yang tersimpan di disk public. */
    private function storedImage(string $path): array
    {
        Storage::disk('public')->assertExists($path);

        return getimagesizefromstring(Storage::disk('public')->get($path));
    }

    #[Test]
    public function uploaded_hero_and_logo_are_downscaled_to_webp(): void
    {
        Storage::fake('public');
        [$village, $user] = $this->villageWithUser();

        $this->actingAs($user)->post('/api/villages/profile/hero-image', [
            'image' => UploadedFile::fake()->image('hero.jpg', 2400, 300),
        ])->assertOk();
        $heroPath = $village->fresh()->hero_image;
        $this->assertStringEndsWith('.webp', $heroPath);
        [$width, $height, $type] = $this->storedImage($heroPath);
        $this->assertSame([1920, 240, IMAGETYPE_WEBP], [$width, $height, $type]);

        $this->actingAs($user)->post('/api/villages/profile/logo', [
            'image' => UploadedFile::fake()->image('logo.png', 800, 100),
        ])->assertOk();
        [$width, $height, $type] = $this->storedImage($village->fresh()->logo);
        $this->assertSame([512, 64, IMAGETYPE_WEBP], [$width, $height, $type]);
    }

    #[Test]
    public function small_images_are_never_upscaled(): void
    {
        Storage::fake('public');
        [$village, $user] = $this->villageWithUser();

        $this->actingAs($user)->post('/api/villages/profile/logo', [
            'image' => UploadedFile::fake()->image('logo.png', 120, 80),
        ])->assertOk();

        [$width, $height] = $this->storedImage($village->fresh()->logo);
        $this->assertSame([120, 80], [$width, $height]);
    }

    #[Test]
    public function phone_photo_exif_rotation_is_applied_before_saving(): void
    {
        Storage::fake('public');
        [$village, $user] = $this->villageWithUser();

        // JPEG 400x200 bertanda EXIF Orientation 6 (kamera diputar 90°): tampil
        // tegak 200x400 di browser, jadi hasil simpanan harus 200x400.
        $canvas = imagecreatetruecolor(400, 200);
        ob_start();
        imagejpeg($canvas);
        $jpeg = ob_get_clean();
        $tiff = 'II*'."\0".pack('V', 8).pack('v', 1)
            .pack('v', 0x0112).pack('v', 3).pack('V', 1).pack('v', 6)."\0\0"
            .pack('V', 0);
        $app1 = "\xFF\xE1".pack('n', strlen($tiff) + 8)."Exif\0\0".$tiff;
        $photo = UploadedFile::fake()->createWithContent('hp.jpg', substr($jpeg, 0, 2).$app1.substr($jpeg, 2));

        $this->actingAs($user)->post('/api/villages/profile/hero-image', [
            'image' => $photo,
        ])->assertOk();

        [$width, $height] = $this->storedImage($village->fresh()->hero_image);
        $this->assertSame([200, 400], [$width, $height]);
    }
}
