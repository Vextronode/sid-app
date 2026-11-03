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
 * Foto profil akun: warga menghapus sendiri (mengganti lewat permintaan,
 * lihat ProfilePhotoRequestTest), Staf SIDUTama boleh langsung mengganti
 * atau menghapus foto warga. Akun yang sedang menjabat tidak bisa diubah
 * lewat jalur ini (fotonya foto pejabat, dikelola di Pejabat Desa).
 */
class UserPhotoEndpointTest extends TestCase
{
    use RefreshDatabase;

    private const JSON = ['Accept' => 'application/json'];

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    #[Test]
    public function warga_cannot_upload_directly_but_can_delete_own_photo(): void
    {
        Storage::disk('public')->put('user-photos/lama.jpg', 'x');
        $warga = User::factory()->create(['role' => 'warga', 'photo_img' => 'user-photos/lama.jpg']);

        // Ganti foto lewat permintaan yang disetujui petugas wilayah.
        $this->actingAs($warga)
            ->post('/api/profile/photo', ['photo' => UploadedFile::fake()->image('baru.jpg')], self::JSON)
            ->assertMethodNotAllowed();
        $this->assertSame('user-photos/lama.jpg', $warga->fresh()->photo_img);

        $this->actingAs($warga)
            ->deleteJson('/api/profile/photo')
            ->assertOk()
            ->assertJsonPath('data.photo_url', null);
        $this->assertNull($warga->fresh()->photo_img);
        Storage::disk('public')->assertMissing('user-photos/lama.jpg');
    }

    #[Test]
    public function current_user_endpoint_returns_photo_url(): void
    {
        $warga = User::factory()->create(['role' => 'warga', 'photo_img' => 'user-photos/x.jpg']);

        $this->actingAs($warga)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.photo_url', fn ($url) => str_ends_with((string) $url, 'user-photos/x.jpg'));
    }

    #[Test]
    public function official_account_cannot_change_own_photo(): void
    {
        $rt = User::factory()->create(['role' => 'rt']);

        $this->actingAs($rt)->deleteJson('/api/profile/photo')->assertForbidden();

        $this->assertNull($rt->fresh()->photo_img);
    }

    #[Test]
    public function petugas_can_replace_and_delete_photo_of_warga_in_same_village(): void
    {
        $village = Village::factory()->create();
        $petugas = User::factory()->create(['role' => 'staf_sid', 'village_id' => $village->id]);
        $warga = User::factory()->create(['role' => 'warga', 'village_id' => $village->id]);

        $this->actingAs($petugas)
            ->post("/api/users/{$warga->id}/photo", ['photo' => UploadedFile::fake()->image('w.jpg')], self::JSON)
            ->assertOk()
            ->assertJsonPath('message', 'Foto profil berhasil disimpan.');
        $path = $warga->fresh()->photo_img;
        Storage::disk('public')->assertExists($path);

        $this->actingAs($petugas)
            ->deleteJson("/api/users/{$warga->id}/photo")
            ->assertOk()
            ->assertJsonPath('message', 'Foto profil berhasil dihapus.');
        $this->assertNull($warga->fresh()->photo_img);
        Storage::disk('public')->assertMissing($path);
    }

    #[Test]
    public function petugas_cannot_change_photo_of_official_account(): void
    {
        $village = Village::factory()->create();
        $petugas = User::factory()->create(['role' => 'staf_sid', 'village_id' => $village->id]);
        $kadus = User::factory()->create(['role' => 'kadus', 'village_id' => $village->id]);

        $this->actingAs($petugas)
            ->post("/api/users/{$kadus->id}/photo", ['photo' => UploadedFile::fake()->image('k.jpg')], self::JSON)
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Akun ini sedang menjabat. Ganti fotonya di halaman Pejabat Desa.');
    }

    #[Test]
    public function petugas_cannot_change_photo_of_warga_in_other_village(): void
    {
        $petugas = User::factory()->create(['role' => 'staf_sid', 'village_id' => Village::factory()]);
        $warga = User::factory()->create(['role' => 'warga', 'village_id' => Village::factory()]);

        $this->actingAs($petugas)
            ->post("/api/users/{$warga->id}/photo", ['photo' => UploadedFile::fake()->image('w.jpg')], self::JSON)
            ->assertNotFound();
        $this->assertNull($warga->fresh()->photo_img);
    }

    #[Test]
    public function non_petugas_cannot_change_photo_of_other_user(): void
    {
        $village = Village::factory()->create();
        $other = User::factory()->create(['role' => 'warga', 'village_id' => $village->id]);
        $warga = User::factory()->create(['role' => 'warga', 'village_id' => $village->id]);

        $this->actingAs($other)
            ->post("/api/users/{$warga->id}/photo", ['photo' => UploadedFile::fake()->image('w.jpg')], self::JSON)
            ->assertForbidden();
    }

    #[Test]
    public function petugas_upload_must_be_a_square_photo(): void
    {
        $village = Village::factory()->create();
        $petugas = User::factory()->create(['role' => 'staf_sid', 'village_id' => $village->id]);
        $warga = User::factory()->create(['role' => 'warga', 'village_id' => $village->id]);

        $this->actingAs($petugas)
            ->post("/api/users/{$warga->id}/photo", ['photo' => UploadedFile::fake()->image('w.jpg', 1600, 900)], self::JSON)
            ->assertUnprocessable()
            ->assertJsonPath('errors.photo.0', 'Foto profil harus persegi (1:1). Potong foto lewat tombol unggah di aplikasi.');
        $this->assertNull($warga->fresh()->photo_img);
    }
}
