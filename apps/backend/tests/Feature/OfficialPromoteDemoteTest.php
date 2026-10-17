<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Official;
use App\Models\OfficialPositionType;
use App\Models\Rt;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OfficialPromoteDemoteTest extends TestCase
{
    use RefreshDatabase;

    // Foto dikirim multipart, jadi respons JSON diminta lewat header.
    private const JSON = ['Accept' => 'application/json'];

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    public function test_petugas_can_promote_citizen_user_and_activity_is_recorded(): void
    {
        $village = Village::factory()->create();
        $actor = User::factory()->create(['role' => 'staf_sid', 'village_id' => $village->id]);
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $target = User::factory()->create([
            'role' => 'warga',
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);
        $rt = Rt::factory()->create(['village_id' => $village->id]);

        $response = $this->actingAs($actor)
            ->post('/api/officials/promote', [
                'user_id' => $target->id,
                'position' => 'rt',
                'rt_id' => $rt->id,
                'started_at' => today()->toDateString(),
                'term_ends_at' => today()->addYear()->toDateString(),
                'photo' => UploadedFile::fake()->image('foto.jpg'),
            ], self::JSON)
            ->assertCreated()
            ->assertJsonPath('data.user_id', $target->id)
            ->assertJsonPath('data.position', 'rt')
            ->assertJsonPath('data.term_ends_at', today()->addYear()->startOfDay()->toISOString());

        $photoPath = Official::query()->findOrFail($response->json('data.id'))->photo_img;
        Storage::disk('public')->assertExists($photoPath);
        $this->assertSame(Storage::disk('public')->url($photoPath), $response->json('data.photo_img'));
        $this->assertSame('rt', $target->fresh()->role);
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'official',
            'description' => 'promoted',
            'subject_id' => (string) $response->json('data.id'),
            'causer_id' => (string) $actor->id,
        ]);
    }

    public function test_promote_is_forbidden_to_non_petugas_and_validates_input(): void
    {
        $citizen = Citizen::factory()->create();
        $target = User::factory()->create(['citizen_id' => $citizen->id]);

        $this->actingAs(User::factory()->create(['role' => 'rt']))
            ->postJson('/api/officials/promote', [])
            ->assertForbidden();

        $actor = User::factory()->create(['role' => 'staf_sid']);
        $this->actingAs($actor)
            ->postJson('/api/officials/promote', [
                'user_id' => $target->id,
                'position' => 'not-a-position',
                'started_at' => 'invalid',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['position', 'started_at', 'photo']);
    }

    public function test_promote_rejects_target_not_in_actor_village(): void
    {
        $actor = User::factory()->create([
            'role' => 'staf_sid',
            'village_id' => Village::factory(),
        ]);
        $targetVillage = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $targetVillage->id]);
        $target = User::factory()->create([
            'role' => 'warga',
            'village_id' => $targetVillage->id,
            'citizen_id' => $citizen->id,
        ]);

        $this->actingAs($actor)
            ->post('/api/officials/promote', [
                'user_id' => $target->id,
                'position' => 'sekdes',
                'started_at' => today()->toDateString(),
                'photo' => UploadedFile::fake()->image('foto.jpg'),
            ], self::JSON)
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Akun target harus warga aktif yang belum menjabat dan terhubung ke data kependudukan.',
            );

        // Penetapan yang gagal tidak meninggalkan berkas foto.
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_position_without_account_can_be_promoted_rotated_and_demoted(): void
    {
        $village = Village::factory()->create();
        $actor = User::factory()->create(['role' => 'staf_sid', 'village_id' => $village->id]);
        $first = Citizen::factory()->create(['village_id' => $village->id]);
        $firstAccount = User::factory()->create([
            'role' => 'warga',
            'village_id' => $village->id,
            'citizen_id' => $first->id,
        ]);
        $second = Citizen::factory()->create(['village_id' => $village->id]);
        OfficialPositionType::factory()->code('kaur_keuangan')->create(['village_id' => $village->id]);
        OfficialPositionType::factory()->code('kaur_perencanaan')->create(['village_id' => $village->id]);

        $promote = fn (Citizen $citizen, string $position) => $this->actingAs($actor)
            ->post('/api/officials/promote', [
                'citizen_id' => $citizen->id,
                'position' => $position,
                'started_at' => today()->toDateString(),
                'photo' => UploadedFile::fake()->image('foto.jpg'),
            ], self::JSON);

        $officialId = $promote($first, 'kaur_keuangan')
            ->assertCreated()
            ->assertJsonPath('data.position', 'kaur_keuangan')
            ->assertJsonPath('data.position_label', 'Kaur Keuangan')
            ->assertJsonPath('data.citizen_id', $first->id)
            ->assertJsonPath('data.user_id', null)
            ->json('data.id');

        // Jabatan tanpa akun tidak mengubah peran akun warganya.
        $this->assertSame('warga', $firstAccount->fresh()->role);
        // Satu warga hanya memegang satu jabatan aktif.
        $promote($first, 'kaur_perencanaan')->assertUnprocessable();

        $newOfficialId = $this->actingAs($actor)
            ->post("/api/officials/{$officialId}/rotate", [
                'citizen_id' => $second->id,
                'started_at' => today()->toDateString(),
                'photo' => UploadedFile::fake()->image('pengganti.jpg'),
            ], self::JSON)
            ->assertOk()
            ->assertJsonPath('data.old_official.is_active', false)
            ->assertJsonPath('data.new_official.position', 'kaur_keuangan')
            ->assertJsonPath('data.new_official.citizen_id', $second->id)
            ->assertJsonPath('data.new_official.user_id', null)
            ->json('data.new_official.id');

        $this->actingAs($actor)
            ->postJson("/api/officials/{$newOfficialId}/demote")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);
    }

    public function test_rotate_of_position_without_account_requires_citizen_and_photo(): void
    {
        $village = Village::factory()->create();
        $actor = User::factory()->create(['role' => 'staf_sid', 'village_id' => $village->id]);
        $old = Official::factory()->position('staf_sipades')->create(['village_id' => $village->id]);

        $this->actingAs($actor)
            ->postJson("/api/officials/{$old->id}/rotate", ['started_at' => today()->toDateString()])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['citizen_id', 'photo'])
            ->assertJsonMissingValidationErrors(['user_id']);
    }

    public function test_petugas_can_replace_official_photo_and_old_file_is_removed(): void
    {
        $village = Village::factory()->create();
        $actor = User::factory()->create(['role' => 'staf_sid', 'village_id' => $village->id]);
        $official = Official::factory()->position('sekdes')->create(['village_id' => $village->id]);

        $upload = fn (string $name) => $this->actingAs($actor)
            ->post("/api/officials/{$official->id}/photo", [
                'photo' => UploadedFile::fake()->image($name),
            ], self::JSON);

        $upload('pertama.jpg')->assertOk()->assertJsonPath('message', 'Foto pejabat berhasil diperbarui.');
        $firstPath = $official->fresh()->photo_img;
        $upload('kedua.jpg')->assertOk();
        $secondPath = $official->fresh()->photo_img;

        $this->assertNotSame($firstPath, $secondPath);
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($secondPath);

        $this->actingAs($actor)
            ->postJson("/api/officials/{$official->id}/photo", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['photo']);

        $foreign = User::factory()->create(['role' => 'staf_sid', 'village_id' => Village::factory()]);
        $this->actingAs($foreign)
            ->post("/api/officials/{$official->id}/photo", [
                'photo' => UploadedFile::fake()->image('asing.jpg'),
            ], self::JSON)
            ->assertForbidden();
        $this->assertSame($secondPath, $official->fresh()->photo_img);
    }

    public function test_petugas_can_delete_official_photo(): void
    {
        $village = Village::factory()->create();
        $actor = User::factory()->create(['role' => 'staf_sid', 'village_id' => $village->id]);
        Storage::disk('public')->put('official-photos/lama.jpg', 'x');
        $official = Official::factory()->position('sekdes')->create([
            'village_id' => $village->id,
            'photo_img' => 'official-photos/lama.jpg',
        ]);

        $foreign = User::factory()->create(['role' => 'staf_sid', 'village_id' => Village::factory()]);
        $this->actingAs($foreign)
            ->deleteJson("/api/officials/{$official->id}/photo")
            ->assertForbidden();
        Storage::disk('public')->assertExists('official-photos/lama.jpg');

        $this->actingAs($actor)
            ->deleteJson("/api/officials/{$official->id}/photo")
            ->assertOk()
            ->assertJsonPath('message', 'Foto pejabat berhasil dihapus.')
            ->assertJsonPath('data.photo_img', null);

        $this->assertNull($official->fresh()->photo_img);
        Storage::disk('public')->assertMissing('official-photos/lama.jpg');
    }

    public function test_demote_returns_warnings_and_updates_user_role(): void
    {
        $village = Village::factory()->create();
        $actor = User::factory()->create(['role' => 'staf_sid', 'village_id' => $village->id]);
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $target = User::factory()->create([
            'role' => 'sekretaris_desa',
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);
        $official = Official::factory()->forUser($target)->position('sekdes')->create([
            'village_id' => $village->id,
        ]);

        $response = $this->actingAs($actor)
            ->postJson("/api/officials/{$official->id}/demote", ['notes' => 'Selesai masa tugas'])
            ->assertOk()
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('warnings', []);

        $this->assertSame('warga', $target->fresh()->role);
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'official',
            'description' => 'demoted',
            'subject_id' => (string) $official->id,
        ]);
    }

    public function test_demote_forbidden_to_non_petugas_and_petugas_cannot_remove_last_one(): void
    {
        $target = User::factory()->create(['role' => 'rt']);
        $official = Official::factory()->forUser($target)->position('rt')->create();

        $this->actingAs(User::factory()->create(['role' => 'warga']))
            ->postJson("/api/officials/{$official->id}/demote")
            ->assertForbidden();

        $petugas = User::factory()->create(['role' => 'staf_sid']);
        $petugasOfficial = Official::factory()->forUser($petugas)->position('staf_sid')->create();

        $this->actingAs($petugas)
            ->postJson("/api/officials/{$petugasOfficial->id}/demote")
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'Aksi gagal karena Anda adalah petugas tersisa. Petugas desa tidak boleh kosong.',
            );
    }

    public function test_rotate_requires_new_user_without_client_supplied_citizen_id(): void
    {
        $village = Village::factory()->create();
        $actor = User::factory()->create(['role' => 'staf_sid', 'village_id' => $village->id]);
        $oldUser = User::factory()->create(['role' => 'sekretaris_desa', 'village_id' => $village->id]);
        $old = Official::factory()->forUser($oldUser)->position('sekdes')->create(['village_id' => $village->id]);
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $newUser = User::factory()->create([
            'role' => 'warga',
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $this->actingAs($actor)
            ->post("/api/officials/{$old->id}/rotate", [
                'user_id' => $newUser->id,
                'started_at' => today()->toDateString(),
                'photo' => UploadedFile::fake()->image('foto.jpg'),
            ], self::JSON)
            ->assertOk()
            ->assertJsonPath('data.new_official.user_id', $newUser->id)
            ->assertJsonPath('warnings', []);
    }

    /**
     * @return array{0: Village, 1: User, 2: Official, 3: User}
     */
    private function stafSidWithCandidate(): array
    {
        $village = Village::factory()->create();
        $staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $village->id]);
        $stafOfficial = Official::factory()->forUser($staf)->position('staf_sid')->create(['village_id' => $village->id]);
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $candidate = User::factory()->create([
            'role' => 'warga',
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        return [$village, $staf, $stafOfficial, $candidate];
    }

    public function test_second_staf_sid_cannot_be_promoted(): void
    {
        [, $staf, , $candidate] = $this->stafSidWithCandidate();

        $this->actingAs($staf)
            ->post('/api/officials/promote', [
                'user_id' => $candidate->id,
                'position' => 'staf_sid',
                'started_at' => today()->toDateString(),
                'photo' => UploadedFile::fake()->image('foto.jpg'),
            ], self::JSON)
            ->assertStatus(409);

        $this->assertSame('warga', $candidate->fresh()->role);
    }

    public function test_staf_sid_can_hand_over_the_position_to_someone_else(): void
    {
        [$village, $staf, $stafOfficial, $candidate] = $this->stafSidWithCandidate();

        $this->actingAs($staf)
            ->post("/api/officials/{$stafOfficial->id}/rotate", [
                'user_id' => $candidate->id,
                'started_at' => today()->toDateString(),
                'photo' => UploadedFile::fake()->image('foto.jpg'),
            ], self::JSON)
            ->assertOk()
            ->assertJsonPath('data.old_official.is_active', false)
            ->assertJsonPath('data.new_official.user_id', $candidate->id)
            ->assertJsonPath('data.new_official.position', 'staf_sid');

        $this->assertSame('warga', $staf->fresh()->role);
        $this->assertSame('staf_sid', $candidate->fresh()->role);
        $this->assertSame(1, User::query()->where('village_id', $village->id)->where('role', 'staf_sid')->count());

        // Peran lama langsung tidak berlaku: endpoint staf ditolak dengan
        // kode yang dipakai FE untuk memuat ulang akun.
        $this->actingAs($staf->fresh())
            ->getJson('/api/officials')
            ->assertForbidden()
            ->assertJsonPath('code', 'role_forbidden');
    }

    public function test_staf_sid_still_cannot_be_demoted_without_replacement(): void
    {
        [, $staf, $stafOfficial] = $this->stafSidWithCandidate();

        $this->actingAs($staf)
            ->postJson("/api/officials/{$stafOfficial->id}/demote")
            ->assertForbidden();

        $this->assertSame('staf_sid', $staf->fresh()->role);
    }
}
