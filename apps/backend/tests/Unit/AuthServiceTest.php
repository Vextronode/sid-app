<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\User;
use App\Models\Village;
use App\Repositories\CitizenRepository;
use App\Repositories\UserRepository;
use App\Services\AuthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AuthServiceTest extends TestCase
{
    use RefreshDatabase;

    private AuthService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new AuthService(
            new CitizenRepository,
            new UserRepository,
        );
    }

    #[Test]
    public function it_registers_a_new_user_using_the_matching_citizen_data(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create([
            'village_id' => $village->id,
            'nik' => '3201012345670001',
        ]);

        $user = $this->service->registerWarga([
            'nik' => '3201012345670001',
            'name' => 'Siti Aminah',
            'email' => 'siti.aminah@example.test',
            'password' => 'RahasiaAman123!',
        ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email' => 'siti.aminah@example.test',
            'role' => 'warga',
            'citizen_id' => $citizen->id,
            'village_id' => $village->id,
            'is_active' => true,
        ]);
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

        $user = $this->service->registerWarga([
            'nik' => '3201012345670002',
            'name' => 'Budi Santoso',
            'email' => 'budi.santoso@example.test',
            'password' => 'RahasiaAman123!',
            // Field ini TIDAK ADA di rules() RegisterUserRequest, tapi
            // seandainya lolos sampai sini (array mentah), harus tetap
            // diabaikan oleh Service.
            'village_id' => $otherVillage->id,
            'citizen_id' => 99999,
            'role' => 'petugas_desa',
        ]);

        $this->assertSame($village->id, $user->village_id);
        $this->assertSame($citizen->id, $user->citizen_id);
        $this->assertSame('warga', $user->role);
    }

    #[Test]
    public function it_rejects_registration_when_nik_is_not_found_in_citizens(): void
    {
        $this->expectException(ValidationException::class);

        try {
            $this->service->registerWarga([
                'nik' => '9999999999999999',
                'name' => 'Warga Tidak Terdaftar',
                'email' => 'tidak.terdaftar@example.test',
                'password' => 'RahasiaAman123!',
            ]);
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('nik', $e->errors());
            $this->assertSame(
                'NIK tidak terdaftar sebagai warga Desa Cibenda',
                $e->errors()['nik'][0]
            );

            throw $e;
        }
    }

    #[Test]
    public function it_rejects_registration_when_the_citizen_already_has_an_account(): void
    {
        $citizen = Citizen::factory()->create(['nik' => '3201012345670003']);
        User::factory()->create(['citizen_id' => $citizen->id]);

        $this->expectException(ValidationException::class);

        try {
            $this->service->registerWarga([
                'nik' => '3201012345670003',
                'name' => 'Siti Aminah',
                'email' => 'akun.baru@example.test',
                'password' => 'RahasiaAman123!',
            ]);
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('nik', $e->errors());
            $this->assertSame(
                'NIK sudah terdaftar, silakan login',
                $e->errors()['nik'][0]
            );

            throw $e;
        }
    }

    #[Test]
    public function it_hashes_the_password_before_storing(): void
    {
        $citizen = Citizen::factory()->create(['nik' => '3201012345670004']);

        $user = $this->service->registerWarga([
            'nik' => '3201012345670004',
            'name' => 'Siti Aminah',
            'email' => 'siti.hash@example.test',
            'password' => 'RahasiaAman123!',
        ]);

        $this->assertNotSame('RahasiaAman123!', $user->password);
        $this->assertTrue(Hash::check('RahasiaAman123!', $user->password));
    }
}
