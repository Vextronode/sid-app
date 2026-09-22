<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisteredUserControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_citizen_with_a_registered_nik_can_register(): void
    {
        $citizen = Citizen::factory()->create(['nik' => '3201012345670001']);

        $response = $this->post('/register', [
            'nik' => '3201012345670001',
            'name' => 'Siti Aminah',
            'email' => 'siti.aminah@example.test',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
        ]);

        $response->assertNoContent();

        $this->assertAuthenticated();

        $this->assertDatabaseHas('users', [
            'email' => 'siti.aminah@example.test',
            'citizen_id' => $citizen->id,
            'village_id' => $citizen->village_id,
            'role' => 'warga',
        ]);
    }

    public function test_registration_is_rejected_when_nik_is_not_registered(): void
    {
        $response = $this->post('/register', [
            'nik' => '9999999999999999',
            'name' => 'Warga Tidak Terdaftar',
            'email' => 'tidak.ada@example.test',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
        ]);

        $response->assertSessionHasErrors('nik');

        $this->assertGuest();

        $this->assertDatabaseMissing('users', [
            'email' => 'tidak.ada@example.test',
        ]);
    }

    public function test_registration_is_rejected_when_citizen_already_has_an_account(): void
    {
        $citizen = Citizen::factory()->create(['nik' => '3201012345670002']);
        User::factory()->create(['citizen_id' => $citizen->id]);

        $response = $this->post('/register', [
            'nik' => '3201012345670002',
            'name' => 'Siti Aminah',
            'email' => 'akun.kedua@example.test',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
        ]);

        $response->assertSessionHasErrors('nik');

        $this->assertGuest();
    }

    public function test_registration_is_rejected_when_email_is_already_taken(): void
    {
        $citizen = Citizen::factory()->create(['nik' => '3201012345670003']);
        User::factory()->create(['email' => 'sudah.ada@example.test']);

        $response = $this->post('/register', [
            'nik' => '3201012345670003',
            'name' => 'Siti Aminah',
            'email' => 'sudah.ada@example.test',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
        ]);

        $response->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_client_supplied_village_id_citizen_id_and_role_are_ignored(): void
    {
        // Titik paling penting dari bug lama (EV5-6-S1): controller versi
        // lama MEWAJIBKAN & MEMVALIDASI ketiga field ini dari request, tapi
        // hasil validasinya dibuang dan diganti hardcode. Sekarang
        // ketiganya bahkan bukan bagian dari kontrak input sama sekali --
        // request ini mengirimnya secara sengaja untuk membuktikan field
        // itu tidak diterima/tidak berpengaruh (unrecognized input dari
        // FormRequest, bukan divalidasi lalu dipakai).
        $citizen = Citizen::factory()->create(['nik' => '3201012345670004']);

        $response = $this->post('/register', [
            'nik' => '3201012345670004',
            'name' => 'Siti Aminah',
            'email' => 'siti.aman@example.test',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
            'village_id' => 999,
            'citizen_id' => 999,
            'role' => 'petugas_desa',
        ]);

        $response->assertNoContent();

        $this->assertDatabaseHas('users', [
            'email' => 'siti.aman@example.test',
            'citizen_id' => $citizen->id,
            'village_id' => $citizen->village_id,
            'role' => 'warga',
        ]);
    }
}
