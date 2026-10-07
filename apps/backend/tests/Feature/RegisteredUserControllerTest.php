<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisteredUserControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_citizen_with_a_registered_nik_can_register_with_generated_username(): void
    {
        $citizen = Citizen::factory()->create([
            'nik' => '3201012345670001',
            'name' => 'Siti Aminah',
        ]);

        $response = $this->post('/register', [
            'nik' => '3201012345670001',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
        ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Akun berhasil dibuat. Simpan username Anda.')
            ->assertJsonPath('data.name', $citizen->name);

        $this->assertSame(['name', 'username'], array_keys($response->json('data')));

        $username = $response->json('data.username');
        $this->assertMatchesRegularExpression('/^[a-z]+\.\d{4}$/', $username);
        $this->assertGuest();

        $user = User::query()->where('citizen_id', $citizen->id)->firstOrFail();
        $this->assertSame($username, $user->username);
        $this->assertNull($user->email);
        $this->assertSame('warga', $user->role);
        $this->assertTrue($user->is_active);
        $this->assertFalse($user->must_change_password);
    }

    public function test_registration_rejects_an_unregistered_or_inactive_citizen(): void
    {
        $response = $this->postJson('/register', [
            'nik' => '9999999999999999',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
        ]);

        $response->assertJsonValidationErrors(['nik'])
            ->assertJsonPath('errors.nik.0', 'NIK tidak terdaftar sebagai warga Desa Cibenda');

        Citizen::factory()->create([
            'nik' => '3201012345670002',
            'is_active' => false,
        ]);
        $inactiveResponse = $this->post('/register', [
            'nik' => '3201012345670002',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
        ]);

        $inactiveResponse->assertRedirect()
            ->assertSessionHasErrors([
                'nik' => 'NIK tidak terdaftar sebagai warga Desa Cibenda',
            ]);
        $this->assertGuest();
    }

    public function test_registration_is_rejected_when_citizen_already_has_an_account(): void
    {
        $citizen = Citizen::factory()->create(['nik' => '3201012345670003']);
        User::factory()->create(['citizen_id' => $citizen->id]);

        $response = $this->post('/register', [
            'nik' => '3201012345670003',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
        ]);

        $response->assertRedirect()
            ->assertSessionHasErrors([
                'nik' => 'NIK sudah terdaftar, silakan login',
            ]);
        $this->assertGuest();
    }

    public function test_registration_requires_a_strong_confirmed_password(): void
    {
        Citizen::factory()->create(['nik' => '3201012345670004']);

        $weak = $this->post('/register', [
            'nik' => '3201012345670004',
            'password' => 'short',
            'password_confirmation' => 'short',
        ]);
        $weak->assertRedirect()->assertSessionHasErrors('password');

        $unconfirmed = $this->post('/register', [
            'nik' => '3201012345670004',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'password-berbeda',
        ]);
        $unconfirmed->assertRedirect()->assertSessionHasErrors('password');
    }

    public function test_registration_ignores_client_supplied_identity_and_account_fields(): void
    {
        $citizen = Citizen::factory()->create([
            'nik' => '3201012345670005',
            'name' => 'Budi Santoso',
        ]);

        $response = $this->postJson('/register', [
            'nik' => '3201012345670005',
            'name' => 'Nama yang tidak dipercaya',
            'email' => 'tidak-dipakai@example.test',
            'username' => 'nama.palsu',
            'date_of_birth' => '2000-01-01',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
            'village_id' => '00000000-0000-4000-8000-000000000000',
            'citizen_id' => '00000000-0000-4000-8000-000000000000',
            'role' => 'petugas_desa',
        ]);

        $response->assertCreated()->assertJsonPath('data.name', $citizen->name);
        $user = User::query()->where('citizen_id', $citizen->id)->firstOrFail();
        $this->assertSame($citizen->name, $user->name);
        $this->assertNotSame('nama.palsu', $user->username);
        $this->assertNull($user->email);
        $this->assertSame('warga', $user->role);
    }

    public function test_registration_generates_different_usernames_for_matching_first_names(): void
    {
        $first = Citizen::factory()->create([
            'nik' => '3201012345670006',
            'name' => 'Siti Aminah',
        ]);
        $firstNik = '3201012345670006';
        $second = Citizen::factory()->create([
            'nik' => '3201012345670007',
            'name' => 'Siti Nurhayati',
        ]);
        $secondNik = '3201012345670007';

        foreach ([[$first, $firstNik], [$second, $secondNik]] as [$citizen, $nik]) {
            $this->post('/register', [
                'nik' => $nik,
                'password' => 'RahasiaAman123!',
                'password_confirmation' => 'RahasiaAman123!',
            ])->assertCreated();
        }

        $users = User::query()->whereIn('citizen_id', [$first->id, $second->id])->get();
        $this->assertCount(2, $users);
        $this->assertCount(2, $users->pluck('username')->unique());
        $this->assertSame(['siti'], $users->map(fn (User $user) => explode('.', $user->username)[0])->unique()->values()->all());
    }

    public function test_registration_is_rate_limited_after_five_attempts_per_ip(): void
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/register', [
                'nik' => sprintf('%016d', 9000000000000000 + $attempt),
                'password' => 'RahasiaAman123!',
                'password_confirmation' => 'RahasiaAman123!',
            ])->assertJsonValidationErrors(['nik']);
        }

        $this->postJson('/register', [
            'nik' => '9000000000000005',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
        ])->assertTooManyRequests();
    }
}
