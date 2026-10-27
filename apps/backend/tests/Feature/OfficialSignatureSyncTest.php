<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Official;
use App\Models\Rt;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * TTD jabatan selain Kepala Desa disalin dari TTD akun pejabatnya dan
 * mengikuti perubahannya selama masih menjabat.
 */
class OfficialSignatureSyncTest extends TestCase
{
    use RefreshDatabase;

    private const JSON = ['Accept' => 'application/json'];

    private Village $village;

    private User $petugas;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Storage::fake('private_uploads');

        $this->village = Village::factory()->create();
        $this->petugas = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);
    }

    public function test_promoted_official_gets_a_copy_of_the_account_signature(): void
    {
        $user = $this->citizenUser();
        $original = $this->giveSignature($user, 'ttd-rt.png');

        $official = $this->promoteRt($user);

        $this->assertNotNull($official->signature_img);
        $this->assertStringStartsWith("official-signatures/{$this->village->id}/{$official->id}/", $official->signature_img);
        // Salinan berupa gambar biasa (bukan berkas terenkripsi akun).
        $this->assertSame($original, Storage::disk('private_uploads')->get($official->signature_img));
    }

    public function test_signature_follows_the_account_while_serving_and_stops_after_the_term(): void
    {
        $user = $this->citizenUser();
        $official = $this->promoteRt($user);
        $this->assertNull($official->signature_img);

        // TTD dibuat setelah menjabat: ikut tersalin.
        $first = $this->giveSignature($user, 'pertama.png');
        $firstPath = $official->fresh()->signature_img;
        $this->assertSame($first, Storage::disk('private_uploads')->get($firstPath));

        // Direset admin: TTD jabatan ikut dikosongkan, lalu diganti TTD baru.
        $this->resetSignature($user);
        $this->assertNull($official->fresh()->signature_img);
        $second = $this->giveSignature($user, 'kedua.png');
        $secondPath = $official->fresh()->signature_img;
        $this->assertNotSame($firstPath, $secondPath);
        $this->assertSame($second, Storage::disk('private_uploads')->get($secondPath));
        // Berkas lama tetap ada untuk surat lama.
        Storage::disk('private_uploads')->assertExists($firstPath);

        // Setelah tidak menjabat, perubahan TTD akun tidak menyentuh jabatan lama.
        $this->actingAs($this->petugas)
            ->postJson("/api/officials/{$official->id}/demote", ['notes' => 'Selesai'])
            ->assertOk();
        $this->resetSignature($user);
        $this->giveSignature($user, 'ketiga.png');
        $this->assertSame($secondPath, $official->fresh()->signature_img);
    }

    public function test_village_head_signature_is_not_taken_from_the_account(): void
    {
        $user = $this->citizenUser();
        $this->giveSignature($user, 'ttd-kades.png');

        $kades = Official::factory()->forUser($user)->position('kepala_desa')->create([
            'village_id' => $this->village->id,
            'citizen_id' => $user->citizen_id,
        ]);
        $this->resetSignature($user);
        $this->giveSignature($user, 'baru.png');

        $this->assertNull($kades->fresh()->signature_img);
    }

    private function citizenUser(): User
    {
        $citizen = Citizen::factory()->create(['village_id' => $this->village->id]);

        return User::factory()->create([
            'role' => 'warga',
            'village_id' => $this->village->id,
            'citizen_id' => $citizen->id,
        ]);
    }

    private function promoteRt(User $user): Official
    {
        $rt = Rt::factory()->create(['village_id' => $this->village->id]);

        $id = $this->actingAs($this->petugas)
            ->post('/api/officials/promote', [
                'user_id' => $user->id,
                'position' => 'rt',
                'rt_id' => $rt->id,
                'started_at' => today()->toDateString(),
                'term_ends_at' => today()->addYear()->toDateString(),
                'photo' => UploadedFile::fake()->image('foto.jpg'),
            ], self::JSON)
            ->assertCreated()
            ->json('data.id');

        return Official::query()->findOrFail($id);
    }

    private function giveSignature(User $user, string $name): string
    {
        $file = UploadedFile::fake()->image($name, 200, 80);
        $content = $file->getContent();

        $this->actingAs($user)
            ->post('/api/profile/signature', ['signature' => $file], self::JSON)
            ->assertCreated();

        return $content;
    }

    private function resetSignature(User $user): void
    {
        $this->actingAs($this->petugas)
            ->postJson("/api/users/{$user->id}/signature/reset", ['reason' => 'Ganti tanda tangan'])
            ->assertOk();
    }
}
