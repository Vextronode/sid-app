<?php

namespace Tests\Feature;

use App\Models\AccountRegistration;
use App\Models\Citizen;
use App\Models\Official;
use App\Models\User;
use App\Models\Village;
use App\Notifications\AccountApprovalNotification;
use App\Services\Auth\AuthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * D1 + D2 (K4). Pendaftaran akun warga menunggu aktivasi petugas wilayah:
 * RT, lalu RW, Kepala Dusun, atau Staf SIDUTama bila jenjang di bawahnya
 * kosong (mengikuti pejabat saat ini). Pendaftaran cukup NIK, kata sandi,
 * dan foto kamera. Foto ada di disk privat selama diproses/ditolak dan
 * menjadi foto profil begitu disetujui; menolak wajib bercatatan; tolak 3
 * kali = diblokir dan hanya bisa diaktifkan manual oleh Staf SIDUTama.
 * Semua kegagalan pendaftaran memakai satu pesan.
 */
class AccountActivationTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private const NIK = '3207010101900001';

    private Village $village;

    private array $area;

    private Citizen $citizen;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('private_uploads');
        Storage::fake('public');
        Notification::fake();

        $this->village = Village::factory()->create();
        $this->area = $this->makeArea($this->village);
        $this->citizen = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'rt_id' => $this->area['rt']->id,
            'hamlet_id' => $this->area['hamlet']->id,
            'nik' => self::NIK,
            'name' => 'Ujang Pendaftar',
        ]);
    }

    public function test_registration_creates_an_inactive_account_waiting_for_the_rt(): void
    {
        $rt = $this->rtOfficial();

        $this->register()
            ->assertCreated()
            ->assertJsonPath('data.name', 'Ujang Pendaftar');

        $user = User::query()->where('citizen_id', $this->citizen->id)->sole();
        $registration = AccountRegistration::query()->sole();
        $this->assertFalse($user->is_active);
        $this->assertSame(AccountRegistration::STATUS_PENDING, $registration->status);
        Storage::disk('private_uploads')->assertExists($registration->photo_path);
        Notification::assertSentTo($rt['user'], AccountApprovalNotification::class);

        // Belum bisa masuk; pesannya menjelaskan alasannya.
        $this->login($user->username, 'RahasiaAman123!')
            ->assertForbidden()
            ->assertJsonPath('message', fn (string $message): bool => str_contains($message, 'menunggu aktivasi'));
    }

    public function test_registration_requires_a_photo(): void
    {
        $this->register(['photo' => null])->assertUnprocessable()->assertJsonValidationErrors('photo');
        $this->assertSame(0, User::query()->count());
    }

    public function test_activation_goes_to_the_lowest_level_that_currently_has_an_official(): void
    {
        $staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);
        $this->register()->assertCreated();
        $registrationId = AccountRegistration::query()->value('id');

        // Belum ada RT/RW/Kadus: Staf SIDUTama.
        $this->assertCanDecide($staf, $registrationId);

        $kadus = $this->makeOfficialUser('kadus', $this->village, ['hamlet_id' => $this->area['hamlet']->id]);
        $this->assertCanDecide($kadus['user'], $registrationId);
        $this->assertNotListed($staf, $registrationId);

        $rw = $this->makeOfficialUser('rw', $this->village, ['rw_id' => $this->area['rw']->id, 'hamlet_id' => $this->area['hamlet']->id]);
        $this->assertCanDecide($rw['user'], $registrationId);
        $this->assertNotListed($kadus['user'], $registrationId);

        $rt = $this->rtOfficial();
        $this->assertCanDecide($rt['user'], $registrationId);
        $this->assertNotListed($rw['user'], $registrationId);

        // RT lain tidak melihat, dan RW tidak bisa memutuskan lagi.
        $otherRt = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $this->makeArea($this->village)['rt']->id]);
        $this->assertNotListed($otherRt['user'], $registrationId);
        $this->actingAs($rw['user'])->postJson("/api/account-registrations/{$registrationId}/approve")->assertForbidden();

        // RT diberhentikan: permintaan naik lagi ke RW.
        $rt['official']->update(['is_active' => false]);
        $this->assertCanDecide($rw['user'], $registrationId);
    }

    public function test_approval_activates_the_account_uses_the_photo_as_profile_photo_and_is_logged(): void
    {
        $rt = $this->rtOfficial();
        $staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);
        $this->register()->assertCreated();
        $registration = AccountRegistration::query()->sole();
        $photo = $registration->photo_path;

        $this->actingAs($rt['user'])->get("/api/account-registrations/{$registration->id}/photo")->assertOk();
        $this->actingAs($rt['user'])->postJson("/api/account-registrations/{$registration->id}/approve")->assertOk();

        $registration->refresh();
        $this->assertSame(AccountRegistration::STATUS_APPROVED, $registration->status);
        $this->assertSame(AccountRegistration::LEVEL_RT, $registration->decided_level);
        $this->assertNull($registration->photo_path);
        Storage::disk('private_uploads')->assertMissing($photo);
        $this->assertTrue($registration->user->is_active);
        // Foto yang diperiksa petugas menjadi foto profil akun (disk publik).
        $this->assertSame('user-photos/'.$this->village->id.'/'.basename($photo), $registration->user->photo_img);
        Storage::disk('public')->assertExists($registration->user->photo_img);
        $this->actingAs($rt['user'])->get("/api/account-registrations/{$registration->id}/photo")->assertNotFound();
        $this->assertSame('registration_approved', Activity::query()->where('log_name', 'account_registration')->sole()->event);

        // Diputuskan: tidak bisa diputuskan lagi, dan Staf melihatnya sebagai riwayat.
        $this->actingAs($rt['user'])->postJson("/api/account-registrations/{$registration->id}/reject", ['notes' => 'Terlambat'])->assertStatus(409);
        $this->actingAs($staf)
            ->getJson('/api/account-registrations')
            ->assertJsonPath('data.0.id', $registration->id)
            ->assertJsonPath('data.0.status', 'approved')
            ->assertJsonPath('data.0.can_decide', false)
            ->assertJsonPath('data.0.has_photo', false);
    }

    public function test_rejection_requires_notes_keeps_the_photo_and_allows_registering_again(): void
    {
        $rt = $this->rtOfficial();
        $staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);
        $this->register()->assertCreated();
        $registration = AccountRegistration::query()->sole();

        $this->actingAs($rt['user'])
            ->postJson("/api/account-registrations/{$registration->id}/reject", ['notes' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('notes');
        $this->actingAs($rt['user'])
            ->postJson("/api/account-registrations/{$registration->id}/reject", ['notes' => 'Foto wajah tidak jelas'])
            ->assertOk();

        // Foto tetap untuk riwayat penolakan: RT yang memutuskan dan Staf boleh melihat.
        $this->actingAs($rt['user'])->get("/api/account-registrations/{$registration->id}/photo")->assertOk();
        $this->actingAs($staf)->get("/api/account-registrations/{$registration->id}/photo")->assertOk();
        $user = $registration->user()->sole();
        $this->login($user->username, 'RahasiaAman123!')
            ->assertForbidden()
            ->assertJsonPath('message', fn (string $message): bool => str_contains($message, 'Foto wajah tidak jelas'));

        // Daftar ulang memakai akun yang sama.
        $this->register(['password' => 'SandiBaru123!', 'password_confirmation' => 'SandiBaru123!'])->assertCreated();
        $this->assertSame(1, User::query()->where('citizen_id', $this->citizen->id)->count());
        $this->assertSame(2, AccountRegistration::query()->count());
    }

    public function test_three_rejections_block_the_nik_until_staf_activates_it_manually(): void
    {
        $rt = $this->rtOfficial();
        $staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);

        foreach (range(1, AccountRegistration::MAX_REJECTIONS) as $attempt) {
            $this->register()->assertCreated();
            $id = AccountRegistration::query()->latest('id')->value('id');
            $this->actingAs($rt['user'])->postJson("/api/account-registrations/{$id}/reject", ['notes' => "Ditolak ke-{$attempt}"])->assertOk();
            auth()->forgetGuards();
        }

        $this->register()->assertUnprocessable()->assertJsonPath('errors.nik.0', AuthService::REGISTRATION_FAILED);
        $user = User::query()->where('citizen_id', $this->citizen->id)->sole();
        $this->login($user->username, 'RahasiaAman123!')
            ->assertForbidden()
            ->assertJsonPath('message', fn (string $message): bool => str_contains($message, 'kantor desa'));

        $latest = AccountRegistration::query()->latest('id')->value('id');
        $this->actingAs($staf)
            ->getJson('/api/account-registrations?status=rejected')
            ->assertJsonPath('data.0.id', $latest)
            ->assertJsonPath('data.0.banned', true)
            ->assertJsonPath('data.0.can_manual_activate', true);
        $this->actingAs($rt['user'])->postJson("/api/account-registrations/{$latest}/manual-activation")->assertForbidden();

        $password = $this->actingAs($staf)
            ->postJson("/api/account-registrations/{$latest}/manual-activation")
            ->assertOk()
            ->json('temporary_password');

        $user->refresh();
        $this->assertTrue($user->is_active);
        $this->assertTrue($user->must_change_password);
        $this->assertSame(
            AccountRegistration::METHOD_MANUAL,
            AccountRegistration::query()->latest('id')->value('method'),
        );
        $this->assertSame(1, Activity::query()->where('event', 'registration_manual_activated')->count());
        auth()->forgetGuards();
        $this->login($user->username, $password)->assertOk();
    }

    public function test_every_registration_failure_gets_the_same_response(): void
    {
        $this->rtOfficial();
        $outsider = $this->register(['nik' => '3207019999990001'])->assertUnprocessable()->json();

        $this->register()->assertCreated();
        $pending = $this->register()->assertUnprocessable()->json();

        $active = Citizen::factory()->create(['village_id' => $this->village->id, 'nik' => '3207010101900002']);
        User::factory()->create(['citizen_id' => $active->id, 'village_id' => $this->village->id]);
        $hasAccount = $this->register(['nik' => '3207010101900002'])->assertUnprocessable()->json();

        $this->assertSame($outsider, $pending);
        $this->assertSame($outsider, $hasAccount);
        $this->assertSame(AuthService::REGISTRATION_FAILED, $outsider['errors']['nik'][0]);
        $this->assertStringNotContainsString('Desa', json_encode($outsider));
    }

    public function test_user_management_does_not_bypass_activation(): void
    {
        $this->rtOfficial();
        $staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);
        $this->register()->assertCreated();
        $user = User::query()->where('citizen_id', $this->citizen->id)->sole();

        $this->actingAs($staf)
            ->getJson('/api/users')
            ->assertOk()
            ->assertJsonMissing(['id' => $user->id]);
        $this->actingAs($staf)->patchJson("/api/users/{$user->id}/toggle-status")->assertStatus(409);
        $this->assertFalse($user->fresh()->is_active);
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

    private function login(string $username, string $password): TestResponse
    {
        // Lepas sesi petugas dari request sebelumnya; login memakai guard web.
        auth()->forgetGuards();
        Auth::shouldUse('web');

        return $this->postJson('/login', ['username' => $username, 'password' => $password]);
    }

    private function register(array $overrides = []): TestResponse
    {
        auth()->forgetGuards();

        $payload = array_filter([
            'nik' => self::NIK,
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
            'photo' => UploadedFile::fake()->image('wajah.jpg', 640, 640),
            ...$overrides,
        ], fn (mixed $value): bool => $value !== null);

        return $this->post('/register', $payload, ['Accept' => 'application/json']);
    }

    private function assertCanDecide(User $official, int $registrationId): void
    {
        auth()->forgetGuards();
        $this->actingAs($official)
            ->getJson('/api/account-registrations?status=pending')
            ->assertOk()
            ->assertJsonPath('data.0.id', $registrationId)
            ->assertJsonPath('data.0.can_decide', true);
    }

    private function assertNotListed(User $official, int $registrationId): void
    {
        auth()->forgetGuards();
        $ids = $this->actingAs($official)->getJson('/api/account-registrations')->assertOk()->json('data.*.id');
        $this->assertNotContains($registrationId, $ids);
    }
}
