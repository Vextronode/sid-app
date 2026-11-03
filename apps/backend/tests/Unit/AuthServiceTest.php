<?php

namespace Tests\Unit;

use App\Models\AccountRegistration;
use App\Models\Citizen;
use App\Models\User;
use App\Models\Village;
use App\Repositories\CitizenRepository;
use App\Repositories\UserRepository;
use App\Services\AccountActivationService;
use App\Services\Auth\AuthService;
use App\Services\Auth\UsernameGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AuthServiceTest extends TestCase
{
    use RefreshDatabase;

    private AuthService $service;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('private_uploads');
        Notification::fake();

        $this->service = $this->makeService(new UsernameGenerator(new UserRepository));
    }

    private function makeService(UsernameGenerator $generator): AuthService
    {
        return new AuthService(
            new CitizenRepository,
            new UserRepository,
            $generator,
            app(AccountActivationService::class),
        );
    }

    /**
     * @return array<string, string>
     */
    private function payloadFor(Citizen $citizen, array $overrides = []): array
    {
        return array_merge([
            'nik' => $citizen->nik,
            'password' => 'RahasiaAman123!',
        ], $overrides);
    }

    private function register(array $payload, ?AuthService $service = null): User
    {
        return ($service ?? $this->service)->registerWarga($payload, UploadedFile::fake()->image('wajah.jpg'));
    }

    private function assertRegistrationFails(callable $register): void
    {
        try {
            $register();
            $this->fail('Pendaftaran seharusnya ditolak.');
        } catch (ValidationException $e) {
            // D2: satu pesan untuk semua kegagalan.
            $this->assertSame(['nik' => [AuthService::REGISTRATION_FAILED]], $e->errors());
        }
    }

    #[Test]
    public function it_registers_an_inactive_user_waiting_for_activation(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create([
            'village_id' => $village->id,
            'nik' => '3201012345670001',
        ]);

        $user = $this->register($this->payloadFor($citizen));

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email' => null,
            'username' => $user->username,
            'name' => $citizen->name,
            'role' => 'warga',
            'citizen_id' => $citizen->id,
            'village_id' => $village->id,
            'is_active' => false,
            'must_change_password' => false,
        ]);
        $this->assertSame(AccountRegistration::STATUS_PENDING, AccountRegistration::query()->where('user_id', $user->id)->value('status'));
    }

    #[Test]
    public function it_never_trusts_village_id_citizen_id_or_role_from_the_input_array(): void
    {
        // Dijamin oleh RegisterUserRequest::rules() yang memang tidak
        // menerima ketiga field ini -- tapi diuji juga di level Service
        // supaya kontrak "3 field ini selalu diturunkan dari Citizen, tidak
        // pernah dari input" tetap terjaga meski Service dipanggil langsung
        // (mis. dari command/job lain) tanpa lewat RegisterUserRequest.
        $village = Village::factory()->create();
        $otherVillage = Village::factory()->create();
        $citizen = Citizen::factory()->create([
            'village_id' => $village->id,
            'nik' => '3201012345670002',
        ]);
        $otherCitizen = Citizen::factory()->create([
            'village_id' => $otherVillage->id,
        ]);

        $user = $this->register($this->payloadFor($citizen, [
            // Field ini tidak boleh memengaruhi identitas hasil register.
            'village_id' => $otherVillage->id,
            'citizen_id' => $otherCitizen->id,
            'role' => 'staf_sid',
            'name' => 'Nama yang tidak dipercaya',
            'email' => 'tidak-dipakai@example.test',
        ]));

        $this->assertSame($village->id, $user->village_id);
        $this->assertSame($citizen->id, $user->citizen_id);
        $this->assertSame('warga', $user->role);
    }

    #[Test]
    public function it_rejects_registration_when_nik_is_not_found_in_citizens(): void
    {
        $this->assertRegistrationFails(fn () => $this->register([
            'nik' => '9999999999999999',
            'password' => 'RahasiaAman123!',
        ]));
    }

    #[Test]
    public function it_rejects_registration_when_the_citizen_already_has_an_account(): void
    {
        $citizen = Citizen::factory()->create(['nik' => '3201012345670003']);
        User::factory()->create(['citizen_id' => $citizen->id]);

        $this->assertRegistrationFails(fn () => $this->register($this->payloadFor($citizen)));
    }

    #[Test]
    public function it_hashes_the_password_before_storing(): void
    {
        $citizen = Citizen::factory()->create(['nik' => '3201012345670004']);

        $user = $this->register($this->payloadFor($citizen));

        $this->assertNotSame('RahasiaAman123!', $user->password);
        $this->assertTrue(Hash::check('RahasiaAman123!', $user->password));
    }

    #[Test]
    public function registered_password_is_validated_by_the_argon2id_hash_driver(): void
    {
        config(['hashing.driver' => 'argon2id']);
        $citizen = Citizen::factory()->create(['nik' => '3201012345670010']);
        $password = 'RahasiaAman123!';

        $user = $this->register($this->payloadFor($citizen, [
            'password' => $password,
        ]));

        $this->assertTrue(Hash::driver('argon2id')->check($password, $user->password));
    }

    #[Test]
    public function it_retries_when_a_username_unique_constraint_is_hit(): void
    {
        $citizen = Citizen::factory()->create([
            'nik' => '3201012345670005',
            'name' => 'Siti Aminah',
        ]);
        User::factory()->create(['username' => 'siti.1234']);

        $generator = Mockery::mock(UsernameGenerator::class);
        $generator->shouldReceive('generate')
            ->twice()
            ->with($citizen->name)
            ->andReturn('siti.1234', 'siti.5678');

        $user = $this->register($this->payloadFor($citizen), $this->makeService($generator));

        $this->assertSame('siti.5678', $user->username);
        $this->assertSame($citizen->id, $user->citizen_id);
    }
}
