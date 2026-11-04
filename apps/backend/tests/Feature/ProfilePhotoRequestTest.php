<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Official;
use App\Models\ProfilePhotoRequest;
use App\Models\User;
use App\Models\Village;
use App\Notifications\AccountApprovalNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * D1/K4. Warga mengganti foto profil lewat permintaan yang diputuskan
 * petugas wilayah dengan jenjang yang sama seperti aktivasi akun. Foto ada
 * di disk privat selama diproses/ditolak dan menjadi foto profil begitu
 * disetujui; menolak wajib bercatatan; Staf SIDUTama melihat seluruh
 * riwayat.
 */
class ProfilePhotoRequestTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $area;

    private User $warga;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('private_uploads');
        Storage::fake('public');
        Notification::fake();

        $this->village = Village::factory()->create();
        $this->area = $this->makeArea($this->village);
        $citizen = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'rt_id' => $this->area['rt']->id,
            'hamlet_id' => $this->area['hamlet']->id,
            'name' => 'Siti Warga',
        ]);
        Storage::disk('public')->put('user-photos/lama.jpg', 'lama');
        $this->warga = User::factory()->create([
            'role' => 'warga',
            'village_id' => $this->village->id,
            'citizen_id' => $citizen->id,
            'name' => 'Siti Warga',
            'photo_img' => 'user-photos/lama.jpg',
        ]);
    }

    public function test_warga_requests_a_new_photo_and_waits_for_the_rt(): void
    {
        $rt = $this->rtOfficial();

        $this->submit()->assertCreated();

        $photoRequest = ProfilePhotoRequest::query()->sole();
        $this->assertSame(ProfilePhotoRequest::STATUS_PENDING, $photoRequest->status);
        Storage::disk('private_uploads')->assertExists($photoRequest->photo_path);
        // Foto lama tetap terpasang sampai disetujui.
        $this->assertSame('user-photos/lama.jpg', $this->warga->fresh()->photo_img);
        Notification::assertSentTo($rt['user'], AccountApprovalNotification::class);

        $this->actingAs($this->warga)
            ->getJson('/api/profile/photo-request')
            ->assertOk()
            ->assertJsonPath('data.status', 'pending');

        // Satu permintaan menunggu per akun.
        $this->submit()->assertStatus(409);
        $this->assertSame(1, ProfilePhotoRequest::query()->count());

        $this->actingAs($rt['user'])
            ->getJson('/api/profile-photo-requests?status=pending')
            ->assertOk()
            ->assertJsonPath('data.0.id', $photoRequest->id)
            ->assertJsonPath('data.0.can_decide', true)
            ->assertJsonPath('data.0.user.current_photo_url', fn ($url) => str_ends_with((string) $url, 'user-photos/lama.jpg'));
    }

    public function test_request_requires_an_image_and_a_warga_account(): void
    {
        $this->submit(UploadedFile::fake()->create('ktp.pdf', 10, 'application/pdf'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('photo');
        // Foto profil selalu persegi (dipotong 1:1 di aplikasi).
        $this->submit(UploadedFile::fake()->image('potret.jpg', 480, 640))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('photo');

        $rt = $this->rtOfficial();
        $this->actingAs($rt['user'])
            ->post('/api/profile/photo-request', ['photo' => UploadedFile::fake()->image('rt.jpg')], ['Accept' => 'application/json'])
            ->assertForbidden();

        $this->assertSame(0, ProfilePhotoRequest::query()->count());
    }

    public function test_request_goes_up_when_lower_levels_are_empty(): void
    {
        $staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);
        $this->submit()->assertCreated();
        $id = ProfilePhotoRequest::query()->value('id');

        $this->assertCanDecide($staf, $id);

        $rw = $this->makeOfficialUser('rw', $this->village, ['rw_id' => $this->area['rw']->id, 'hamlet_id' => $this->area['hamlet']->id]);
        $this->assertCanDecide($rw['user'], $id);
        $this->actingAs($staf)->postJson("/api/profile-photo-requests/{$id}/approve")->assertForbidden();
    }

    public function test_approval_makes_the_photo_the_profile_photo(): void
    {
        $rt = $this->rtOfficial();
        $staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);
        $this->submit()->assertCreated();
        $photoRequest = ProfilePhotoRequest::query()->sole();
        $photo = $photoRequest->photo_path;

        $this->actingAs($rt['user'])->get("/api/profile-photo-requests/{$photoRequest->id}/photo")->assertOk();
        $this->actingAs($rt['user'])->postJson("/api/profile-photo-requests/{$photoRequest->id}/approve")->assertOk();

        $photoRequest->refresh();
        $this->assertSame(ProfilePhotoRequest::STATUS_APPROVED, $photoRequest->status);
        $this->assertSame('rt', $photoRequest->decided_level);
        $this->assertNull($photoRequest->photo_path);
        Storage::disk('private_uploads')->assertMissing($photo);

        $newPhoto = $this->warga->fresh()->photo_img;
        $this->assertSame('user-photos/'.$this->village->id.'/'.basename($photo), $newPhoto);
        Storage::disk('public')->assertExists($newPhoto);
        Storage::disk('public')->assertMissing('user-photos/lama.jpg');

        $this->assertSame('profile_photo_approved', Activity::query()->where('log_name', 'profile_photo_request')->sole()->event);
        Notification::assertSentTo($this->warga, AccountApprovalNotification::class);

        // Riwayat untuk Staf; tidak bisa diputuskan lagi.
        $this->actingAs($rt['user'])->postJson("/api/profile-photo-requests/{$photoRequest->id}/reject", ['notes' => 'Terlambat'])->assertStatus(409);
        $this->actingAs($staf)
            ->getJson('/api/profile-photo-requests')
            ->assertJsonPath('data.0.id', $photoRequest->id)
            ->assertJsonPath('data.0.status', 'approved')
            ->assertJsonPath('data.0.can_decide', false)
            ->assertJsonPath('data.0.has_photo', false);
    }

    public function test_rejection_requires_notes_keeps_the_photo_and_allows_a_new_request(): void
    {
        $rt = $this->rtOfficial();
        $staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);
        $this->submit()->assertCreated();
        $photoRequest = ProfilePhotoRequest::query()->sole();

        $this->actingAs($rt['user'])
            ->postJson("/api/profile-photo-requests/{$photoRequest->id}/reject", ['notes' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('notes');
        $this->actingAs($rt['user'])
            ->postJson("/api/profile-photo-requests/{$photoRequest->id}/reject", ['notes' => 'Wajah tertutup masker'])
            ->assertOk();

        $this->assertSame('user-photos/lama.jpg', $this->warga->fresh()->photo_img);
        $this->actingAs($rt['user'])->get("/api/profile-photo-requests/{$photoRequest->id}/photo")->assertOk();
        $this->actingAs($staf)->get("/api/profile-photo-requests/{$photoRequest->id}/photo")->assertOk();
        Notification::assertSentTo($this->warga, AccountApprovalNotification::class);
        $this->actingAs($this->warga)
            ->getJson('/api/profile/photo-request')
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.decision_notes', 'Wajah tertutup masker');

        $this->submit()->assertCreated();
        $this->assertSame(2, ProfilePhotoRequest::query()->count());
    }

    public function test_request_of_an_account_that_became_an_official_can_only_be_rejected(): void
    {
        $rt = $this->rtOfficial();
        $this->submit()->assertCreated();
        $id = ProfilePhotoRequest::query()->value('id');

        $this->warga->update(['role' => 'kadus']);

        $this->actingAs($rt['user'])->postJson("/api/profile-photo-requests/{$id}/approve")->assertStatus(409);
        $this->assertSame('user-photos/lama.jpg', $this->warga->fresh()->photo_img);
        $this->actingAs($rt['user'])
            ->postJson("/api/profile-photo-requests/{$id}/reject", ['notes' => 'Sudah menjabat'])
            ->assertOk();
    }

    /**
     * @return array{user: User, official: Official, citizen: Citizen}
     */
    private function rtOfficial(): array
    {
        return $this->makeOfficialUser('rt', $this->village, [
            'rt_id' => $this->area['rt']->id,
            'rw_id' => $this->area['rw']->id,
            'hamlet_id' => $this->area['hamlet']->id,
        ]);
    }

    private function submit(?UploadedFile $photo = null): TestResponse
    {
        auth()->forgetGuards();

        return $this->actingAs($this->warga)->post(
            '/api/profile/photo-request',
            ['photo' => $photo ?? UploadedFile::fake()->image('wajah.jpg', 640, 640)],
            ['Accept' => 'application/json'],
        );
    }

    private function assertCanDecide(User $official, int $id): void
    {
        auth()->forgetGuards();
        $this->actingAs($official)
            ->getJson('/api/profile-photo-requests?status=pending')
            ->assertOk()
            ->assertJsonPath('data.0.id', $id)
            ->assertJsonPath('data.0.can_decide', true);
    }
}
