<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\User;
use App\Services\Auth\AuthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class RegisteredUserControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('private_uploads');
        Notification::fake();
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadFor(Citizen $citizen, array $overrides = []): array
    {
        return array_merge([
            'nik' => $citizen->nik,
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
            'photo' => UploadedFile::fake()->image('wajah.jpg'),
        ], $overrides);
    }

    /**
     * Multipart (foto), dengan jawaban JSON.
     */
    private function registerJson(array $payload): TestResponse
    {
        return $this->post('/register', $payload, ['Accept' => 'application/json']);
    }

    public function test_a_citizen_with_a_registered_nik_can_register_with_generated_username(): void
    {
        $citizen = Citizen::factory()->create([
            'nik' => '3201012345670001',
            'name' => 'Siti Aminah',
        ]);

        $response = $this->post('/register', $this->payloadFor($citizen));

        $response->assertCreated()
            ->assertJsonPath('message', 'Pendaftaran terkirim. Akun aktif setelah disetujui petugas wilayah. Simpan username Anda.')
            ->assertJsonPath('data.name', $citizen->name);

        $this->assertSame(['name', 'username'], array_keys($response->json('data')));

        $username = $response->json('data.username');
        // Dua kata: namadepan.namabelakang.4digit (UsernameGenerator).
        $this->assertMatchesRegularExpression('/^siti\.aminah\.\d{4}$/', $username);
        $this->assertGuest();

        $user = User::query()->where('citizen_id', $citizen->id)->firstOrFail();
        $this->assertSame($username, $user->username);
        $this->assertNull($user->email);
        $this->assertSame('warga', $user->role);
        // D1: akun menunggu aktivasi petugas wilayah (AccountActivationTest).
        $this->assertFalse($user->is_active);
        $this->assertFalse($user->must_change_password);
    }

    public function test_registration_rejects_an_unregistered_or_inactive_citizen(): void
    {
        $response = $this->registerJson([
            'nik' => '9999999999999999',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
            'photo' => UploadedFile::fake()->image('wajah.jpg'),
        ]);

        $response->assertJsonValidationErrors(['nik'])
            ->assertJsonPath('errors.nik.0', AuthService::REGISTRATION_FAILED);

        $inactiveCitizen = Citizen::factory()->create([
            'nik' => '3201012345670002',
            'is_active' => false,
        ]);
        $inactiveResponse = $this->post('/register', $this->payloadFor($inactiveCitizen));

        $inactiveResponse->assertRedirect()
            ->assertSessionHasErrors(['nik' => AuthService::REGISTRATION_FAILED]);
        $this->assertGuest();
    }

    public function test_registration_is_rejected_when_citizen_already_has_an_account(): void
    {
        $citizen = Citizen::factory()->create(['nik' => '3201012345670003']);
        User::factory()->create(['citizen_id' => $citizen->id]);

        $response = $this->post('/register', $this->payloadFor($citizen));

        $response->assertRedirect()
            ->assertSessionHasErrors(['nik' => AuthService::REGISTRATION_FAILED]);
        $this->assertGuest();
    }

    public function test_registration_requires_a_strong_confirmed_password(): void
    {
        $citizen = Citizen::factory()->create(['nik' => '3201012345670004']);

        $weak = $this->post('/register', $this->payloadFor($citizen, [
            'password' => 'short',
            'password_confirmation' => 'short',
        ]));
        $weak->assertRedirect()->assertSessionHasErrors('password');

        $unconfirmed = $this->post('/register', $this->payloadFor($citizen, [
            'password_confirmation' => 'password-berbeda',
        ]));
        $unconfirmed->assertRedirect()->assertSessionHasErrors('password');
    }

    public function test_registration_ignores_client_supplied_identity_and_account_fields(): void
    {
        $citizen = Citizen::factory()->create([
            'nik' => '3201012345670005',
            'name' => 'Budi Santoso',
        ]);

        $response = $this->registerJson($this->payloadFor($citizen, [
            'name' => 'Nama yang tidak dipercaya',
            'email' => 'tidak-dipakai@example.test',
            'username' => 'nama.palsu',
            'village_id' => '00000000-0000-4000-8000-000000000000',
            'citizen_id' => '00000000-0000-4000-8000-000000000000',
            'role' => 'staf_sid',
        ]));

        $response->assertCreated()->assertJsonPath('data.name', $citizen->name);
        $user = User::query()->where('citizen_id', $citizen->id)->firstOrFail();
        $this->assertSame($citizen->name, $user->name);
        $this->assertNotSame('nama.palsu', $user->username);
        $this->assertNull($user->email);
        $this->assertSame('warga', $user->role);
    }

    public function test_citizens_with_the_same_name_get_different_four_digit_usernames(): void
    {
        $first = Citizen::factory()->create(['nik' => '3201012345670008', 'name' => 'Siti Aminah']);
        $second = Citizen::factory()->create(['nik' => '3201012345670009', 'name' => 'Siti Aminah']);

        foreach ([$first, $second] as $citizen) {
            $this->post('/register', $this->payloadFor($citizen))->assertCreated();
        }

        $usernames = User::query()->whereIn('citizen_id', [$first->id, $second->id])->pluck('username');
        $this->assertCount(2, $usernames->unique());
        foreach ($usernames as $username) {
            $this->assertMatchesRegularExpression('/^siti\.aminah\.\d{4}$/', $username);
        }
    }

    public function test_registration_generates_different_usernames_for_matching_first_names(): void
    {
        $first = Citizen::factory()->create([
            'nik' => '3201012345670006',
            'name' => 'Siti Aminah',
        ]);
        $second = Citizen::factory()->create([
            'nik' => '3201012345670007',
            'name' => 'Siti Nurhayati',
        ]);

        foreach ([$first, $second] as $citizen) {
            $this->post('/register', $this->payloadFor($citizen))->assertCreated();
        }

        $users = User::query()->whereIn('citizen_id', [$first->id, $second->id])->get();
        $this->assertCount(2, $users);
        $this->assertCount(2, $users->pluck('username')->unique());
        $this->assertSame(['siti'], $users->map(fn (User $user) => explode('.', $user->username)[0])->unique()->values()->all());
    }

    public function test_registration_is_rate_limited_after_five_attempts_per_ip(): void
    {
        $payload = fn (int $attempt): array => [
            'nik' => sprintf('%016d', 9000000000000000 + $attempt),
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
            'photo' => UploadedFile::fake()->image('wajah.jpg'),
        ];

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->registerJson($payload($attempt))->assertJsonValidationErrors(['nik']);
        }

        $this->registerJson($payload(5))->assertTooManyRequests();
    }
}
