<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\User;
use App\Models\Village;
use App\Models\VillageOrgMember;
use App\Models\VillageOrgPosition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class VillageOrgMemberEndpointTest extends TestCase
{
    use RefreshDatabase;

    private const OTHER_NIK = '3201010101019999';

    private int $nikSequence = 0;

    /**
     * Warga aktif desa staf; pemegang jabatan dipilih lewat NIK-nya.
     */
    private function nikOf(User $user, string $name): string
    {
        $nik = sprintf('320101010101%04d', ++$this->nikSequence);
        Citizen::factory()->create(['village_id' => $user->village_id, 'nik' => $nik, 'name' => $name, 'is_active' => true]);

        return $nik;
    }

    private function stafSid(): User
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);

        return User::factory()->create([
            'village_id' => $village->id,
            'role' => 'staf_sid',
        ]);
    }

    #[Test]
    public function guest_cannot_add_member(): void
    {
        $position = VillageOrgPosition::factory()->create();

        $response = $this->postJson("/api/village-org-positions/{$position->id}/members", [
            'nik' => self::OTHER_NIK,
            'started_at' => '2024-01-01',
        ]);

        $response->assertStatus(401);
    }

    #[Test]
    public function non_staf_sid_cannot_add_member(): void
    {
        $user = User::factory()->create(['role' => 'warga']);
        $position = VillageOrgPosition::factory()->create();

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'nik' => self::OTHER_NIK,
            'started_at' => '2024-01-01',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function staf_sid_can_add_first_member(): void
    {
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);

        $nik = $this->nikOf($user, 'Budi Santoso');

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'nik' => $nik,
            'phone_wa' => '6281111222333',
            'started_at' => '2024-01-01',
        ]);

        // Nama diambil dari data warga pemilik NIK.
        $response->assertCreated()
            ->assertJsonPath('data.member_name', 'Budi Santoso')
            ->assertJsonPath('data.nik_masked', '************'.substr($nik, -4))
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.position_id', $position->id);
    }

    #[Test]
    public function adding_member_to_single_occupant_position_rotates_previous_active_member(): void
    {
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create([
            'village_id' => $user->village_id,
            'is_single_occupant' => true,
        ]);
        $oldMember = VillageOrgMember::factory()->create([
            'position_id' => $position->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'nik' => $this->nikOf($user, 'Pengganti Baru'),
            'started_at' => '2026-08-01',
        ]);

        $response->assertCreated()->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('village_org_members', [
            'id' => $oldMember->id,
            'is_active' => false,
        ]);
    }

    #[Test]
    public function adding_member_to_multi_occupant_position_keeps_previous_member_active(): void
    {
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create([
            'village_id' => $user->village_id,
            'is_single_occupant' => false,
        ]);
        $existingMember = VillageOrgMember::factory()->create([
            'position_id' => $position->id,
            'is_active' => true,
        ]);

        $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'nik' => $this->nikOf($user, 'Anggota Kedua'),
            'started_at' => '2026-08-01',
        ])->assertCreated();

        $this->assertDatabaseHas('village_org_members', [
            'id' => $existingMember->id,
            'is_active' => true,
        ]);
    }

    #[Test]
    public function adding_member_is_forbidden_when_position_feature_not_active(): void
    {
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->inactive()->create(['village_id' => $user->village_id]);

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'nik' => self::OTHER_NIK,
            'started_at' => '2024-01-01',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Fitur rotasi untuk organisasi ini belum diaktifkan, menunggu konfirmasi desa.');
    }

    #[Test]
    public function adding_member_without_required_fields_fails_validation(): void
    {
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nik', 'started_at']);
    }

    #[Test]
    public function staf_sid_can_update_member(): void
    {
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id, 'member_name' => 'Lama']);

        $response = $this->actingAs($user)->patchJson(
            "/api/village-org-positions/{$position->id}/members/{$member->id}",
            ['phone_wa' => '6281234567890', 'member_name' => 'Diabaikan']
        );

        // Nama mengikuti data warga; yang bisa diubah hanya kontak dan catatan.
        $response->assertOk()
            ->assertJsonPath('data.phone_wa', '6281234567890')
            ->assertJsonPath('data.member_name', 'Lama');
    }

    #[Test]
    public function updating_member_via_mismatched_position_url_returns_not_found(): void
    {
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);
        $otherPosition = VillageOrgPosition::factory()->wakilKetua()->create([
            'village_id' => $user->village_id,
            'org_type' => $position->org_type,
        ]);
        $member = VillageOrgMember::factory()->create(['position_id' => $otherPosition->id]);

        $response = $this->actingAs($user)->patchJson(
            "/api/village-org-positions/{$position->id}/members/{$member->id}",
            ['phone_wa' => '6280000000000']
        );

        $response->assertStatus(404);
    }

    /**
     * Guard multi-tenant (EV5-10-S2): Staf SIDUTama satu desa tidak boleh
     * bisa menambah/mengubah/mengakhiri anggota jabatan milik desa lain,
     * walau position_id-nya valid.
     */
    #[Test]
    public function adding_member_to_position_of_other_village_returns_404(): void
    {
        $user = $this->stafSid();
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL5']);
        $position = VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id]);

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'nik' => self::OTHER_NIK,
            'started_at' => '2024-01-01',
        ]);

        $response->assertStatus(404)
            ->assertJsonPath('message', 'Jabatan organisasi tidak ditemukan.');
    }

    #[Test]
    public function updating_member_of_position_belonging_to_other_village_returns_404(): void
    {
        $user = $this->stafSid();
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL6']);
        $position = VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id]);

        $response = $this->actingAs($user)->patchJson(
            "/api/village-org-positions/{$position->id}/members/{$member->id}",
            ['phone_wa' => '6280000000000']
        );

        $response->assertStatus(404);
    }

    #[Test]
    public function adding_member_with_from_member_id_does_not_require_member_name(): void
    {
        $user = $this->stafSid();
        $this->actingAs($user)->getJson('/api/village-org-positions?org_type=bpd')->assertOk();
        $ketua = VillageOrgPosition::query()->where('org_type', 'bpd')->where('slot', 'ketua')->firstOrFail();
        $anggota = VillageOrgPosition::query()->where('org_type', 'bpd')->where('slot', 'anggota')->firstOrFail();
        $member = VillageOrgMember::factory()->create([
            'position_id' => $anggota->id,
            'member_name' => 'Siti Aminah',
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$ketua->id}/members", [
            'from_member_id' => $member->id,
            'started_at' => '2026-10-01',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.member_name', 'Siti Aminah')
            ->assertJsonPath('data.position_id', $ketua->id);
        $this->assertDatabaseHas('village_org_members', ['id' => $member->id, 'is_active' => false]);
    }

    #[Test]
    public function adding_member_with_invalid_previous_holder_fails_validation(): void
    {
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'nik' => self::OTHER_NIK,
            'started_at' => '2026-10-01',
            'previous_holder' => 'hapus',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['previous_holder']);
    }

    #[Test]
    public function staf_sid_can_end_ketua_and_demote_to_anggota(): void
    {
        $user = $this->stafSid();
        $ketua = VillageOrgPosition::factory()->create(['village_id' => $user->village_id, 'org_type' => 'lpm']);
        $holder = VillageOrgMember::factory()->create([
            'position_id' => $ketua->id,
            'member_name' => 'Ketua Lama',
            'is_active' => true,
            'ended_at' => null,
        ]);

        $response = $this->actingAs($user)->postJson(
            "/api/village-org-positions/{$ketua->id}/members/{$holder->id}/end",
            ['ended_at' => '2026-10-01', 'to_member' => true]
        );

        $response->assertOk()
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.ended_at', '2026-10-01');
        $anggota = VillageOrgPosition::query()->where('org_type', 'lpm')->where('slot', 'anggota')->firstOrFail();
        $this->assertDatabaseHas('village_org_members', [
            'position_id' => $anggota->id,
            'member_name' => 'Ketua Lama',
            'is_active' => true,
        ]);
    }

    #[Test]
    public function ending_member_of_position_belonging_to_other_village_returns_404(): void
    {
        $user = $this->stafSid();
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL8']);
        $position = VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id, 'is_active' => true]);

        $response = $this->actingAs($user)->postJson(
            "/api/village-org-positions/{$position->id}/members/{$member->id}/end"
        );

        $response->assertStatus(404);
        $this->assertDatabaseHas('village_org_members', ['id' => $member->id, 'is_active' => true]);
    }

    #[Test]
    public function staf_sid_can_upload_replace_and_delete_member_photo(): void
    {
        Storage::fake('public');
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id, 'photo_img' => null]);
        $url = "/api/village-org-positions/{$position->id}/members/{$member->id}/photo";

        $this->actingAs($user)
            ->post($url, ['photo' => UploadedFile::fake()->image('ketua.png')], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.photo_img', fn ($value) => str_contains((string) $value, 'org-member-photos/'));
        $firstPath = $member->fresh()->photo_img;
        Storage::disk('public')->assertExists($firstPath);

        $this->actingAs($user)
            ->post($url, ['photo' => UploadedFile::fake()->image('baru.jpg')], ['Accept' => 'application/json'])
            ->assertOk();
        $secondPath = $member->fresh()->photo_img;
        $this->assertNotSame($firstPath, $secondPath);
        Storage::disk('public')->assertMissing($firstPath);

        $this->actingAs($user)->deleteJson($url)->assertOk()->assertJsonPath('data.photo_img', null);
        $this->assertNull($member->fresh()->photo_img);
        Storage::disk('public')->assertMissing($secondPath);
    }

    #[Test]
    public function photo_shared_with_history_row_is_kept_when_replaced(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('org-member-photos/shared.png', 'x');
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);
        VillageOrgMember::factory()->inactive()->create([
            'position_id' => $position->id,
            'photo_img' => 'org-member-photos/shared.png',
        ]);
        $member = VillageOrgMember::factory()->create([
            'position_id' => $position->id,
            'photo_img' => 'org-member-photos/shared.png',
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/village-org-positions/{$position->id}/members/{$member->id}/photo")
            ->assertOk();

        Storage::disk('public')->assertExists('org-member-photos/shared.png');
    }

    #[Test]
    public function uploading_non_image_photo_fails_validation(): void
    {
        Storage::fake('public');
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id]);

        $this->actingAs($user)
            ->post(
                "/api/village-org-positions/{$position->id}/members/{$member->id}/photo",
                ['photo' => UploadedFile::fake()->create('dokumen.pdf', 10, 'application/pdf')],
                ['Accept' => 'application/json'],
            )
            ->assertStatus(422)
            ->assertJsonValidationErrors(['photo']);
    }

    #[Test]
    public function uploading_photo_for_member_of_other_village_returns_404(): void
    {
        Storage::fake('public');
        $user = $this->stafSid();
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL9']);
        $position = VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id, 'photo_img' => null]);

        $this->actingAs($user)
            ->post(
                "/api/village-org-positions/{$position->id}/members/{$member->id}/photo",
                ['photo' => UploadedFile::fake()->image('x.png')],
                ['Accept' => 'application/json'],
            )
            ->assertStatus(404);
        $this->assertNull($member->fresh()->photo_img);
    }

    #[Test]
    public function nik_outside_the_village_is_rejected(): void
    {
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL10']);
        Citizen::factory()->create(['village_id' => $otherVillage->id, 'nik' => self::OTHER_NIK]);

        $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'nik' => self::OTHER_NIK,
            'started_at' => '2026-10-01',
        ])->assertNotFound()->assertJsonPath('message', 'NIK tidak ditemukan di data warga desa ini.');

        $this->assertDatabaseCount('village_org_members', 0);
    }

    #[Test]
    public function citizen_cannot_hold_two_active_positions_in_one_organization(): void
    {
        $user = $this->stafSid();
        $this->actingAs($user)->getJson('/api/village-org-positions?org_type=pkk')->assertOk();
        $ketua = VillageOrgPosition::query()->where('org_type', 'pkk')->where('slot', 'ketua')->firstOrFail();
        $anggota = VillageOrgPosition::query()->where('org_type', 'pkk')->where('slot', 'anggota')->firstOrFail();
        $nik = $this->nikOf($user, 'Siti Aminah');

        $this->actingAs($user)->postJson("/api/village-org-positions/{$anggota->id}/members", [
            'nik' => $nik,
            'started_at' => '2026-10-01',
        ])->assertCreated();

        $this->actingAs($user)->postJson("/api/village-org-positions/{$ketua->id}/members", [
            'nik' => $nik,
            'started_at' => '2026-10-02',
        ])->assertStatus(422);
    }

    #[Test]
    public function citizen_lookup_returns_the_name_of_a_village_citizen(): void
    {
        $user = $this->stafSid();
        $nik = $this->nikOf($user, 'Budi Santoso');

        $this->actingAs($user)
            ->getJson("/api/village-org-positions/citizen-lookup?nik={$nik}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Budi Santoso')
            ->assertJsonPath('data.nik_masked', '************'.substr($nik, -4));
        $this->actingAs($user)
            ->getJson('/api/village-org-positions/citizen-lookup?nik='.self::OTHER_NIK)
            ->assertNotFound();
    }

    #[Test]
    public function anggota_membership_is_ended_into_history_and_never_deleted(): void
    {
        Storage::fake('public');
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->multiOccupant()->create(['village_id' => $user->village_id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id, 'is_active' => true, 'ended_at' => null]);
        $url = "/api/village-org-positions/{$position->id}/members/{$member->id}";

        // Tidak ada lagi endpoint hapus.
        $this->actingAs($user)->deleteJson($url)->assertStatus(405);

        $this->actingAs($user)
            ->postJson("{$url}/end", ['ended_at' => '2026-10-01'])
            ->assertOk()
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.ended_at', '2026-10-01');

        // Riwayat tidak dapat diubah, termasuk fotonya.
        $this->actingAs($user)->patchJson($url, ['phone_wa' => '6281'])->assertStatus(422);
        $this->actingAs($user)
            ->post("{$url}/photo", ['photo' => UploadedFile::fake()->image('x.png')], ['Accept' => 'application/json'])
            ->assertStatus(422);
        $this->assertDatabaseHas('village_org_members', ['id' => $member->id, 'is_active' => false]);
    }

    #[Test]
    public function member_photo_must_be_square(): void
    {
        Storage::fake('public');
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id, 'photo_img' => null]);

        $this->actingAs($user)
            ->post(
                "/api/village-org-positions/{$position->id}/members/{$member->id}/photo",
                ['photo' => UploadedFile::fake()->image('lebar.jpg', 1600, 900)],
                ['Accept' => 'application/json'],
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('photo');
    }
}
