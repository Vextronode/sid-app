<?php

namespace Tests\Feature;

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
            'member_name' => 'Budi Santoso',
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
            'member_name' => 'Budi Santoso',
            'started_at' => '2024-01-01',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function staf_sid_can_add_first_member(): void
    {
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'member_name' => 'Budi Santoso',
            'phone_wa' => '6281111222333',
            'started_at' => '2024-01-01',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.member_name', 'Budi Santoso')
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
            'member_name' => 'Pengganti Baru',
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
            'member_name' => 'Anggota Kedua',
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
            'member_name' => 'Budi Santoso',
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
            ->assertJsonValidationErrors(['member_name', 'started_at']);
    }

    #[Test]
    public function staf_sid_can_update_member(): void
    {
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id, 'member_name' => 'Lama']);

        $response = $this->actingAs($user)->patchJson(
            "/api/village-org-positions/{$position->id}/members/{$member->id}",
            ['member_name' => 'Baru']
        );

        $response->assertOk()->assertJsonPath('data.member_name', 'Baru');
    }

    #[Test]
    public function staf_sid_can_delete_member(): void
    {
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->multiOccupant()->create(['village_id' => $user->village_id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id]);

        $response = $this->actingAs($user)->deleteJson(
            "/api/village-org-positions/{$position->id}/members/{$member->id}"
        );

        $response->assertOk()->assertJsonPath('message', 'Anggota organisasi berhasil dihapus');
        $this->assertDatabaseMissing('village_org_members', ['id' => $member->id]);
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
            ['member_name' => 'Baru']
        );

        $response->assertStatus(404);
    }

    /**
     * Guard multi-tenant (EV5-10-S2): Petugas Desa satu desa tidak boleh
     * bisa menambah/mengubah/menghapus anggota jabatan milik desa lain,
     * walau position_id-nya valid.
     */
    #[Test]
    public function adding_member_to_position_of_other_village_returns_404(): void
    {
        $user = $this->stafSid();
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL5']);
        $position = VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id]);

        $response = $this->actingAs($user)->postJson("/api/village-org-positions/{$position->id}/members", [
            'member_name' => 'Budi Santoso',
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
            ['member_name' => 'Baru']
        );

        $response->assertStatus(404);
    }

    #[Test]
    public function deleting_member_of_position_belonging_to_other_village_returns_404(): void
    {
        $user = $this->stafSid();
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'DLL7']);
        $position = VillageOrgPosition::factory()->create(['village_id' => $otherVillage->id]);
        $member = VillageOrgMember::factory()->create(['position_id' => $position->id]);

        $response = $this->actingAs($user)->deleteJson(
            "/api/village-org-positions/{$position->id}/members/{$member->id}"
        );

        $response->assertStatus(404);
        $this->assertDatabaseHas('village_org_members', ['id' => $member->id]);
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
            'member_name' => 'Budi',
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
    public function deleting_active_ketua_is_rejected(): void
    {
        $user = $this->stafSid();
        $ketua = VillageOrgPosition::factory()->create(['village_id' => $user->village_id]);
        $holder = VillageOrgMember::factory()->create(['position_id' => $ketua->id, 'is_active' => true]);

        $response = $this->actingAs($user)->deleteJson(
            "/api/village-org-positions/{$ketua->id}/members/{$holder->id}"
        );

        $response->assertStatus(422);
        $this->assertDatabaseHas('village_org_members', ['id' => $holder->id]);
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
    public function deleting_member_removes_its_photo_file(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('org-member-photos/anggota.png', 'x');
        $user = $this->stafSid();
        $position = VillageOrgPosition::factory()->multiOccupant()->create(['village_id' => $user->village_id]);
        $member = VillageOrgMember::factory()->create([
            'position_id' => $position->id,
            'photo_img' => 'org-member-photos/anggota.png',
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/village-org-positions/{$position->id}/members/{$member->id}")
            ->assertOk();

        Storage::disk('public')->assertMissing('org-member-photos/anggota.png');
    }
}
