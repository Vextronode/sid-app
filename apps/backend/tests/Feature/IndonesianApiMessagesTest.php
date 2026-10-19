<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Semua pesan error API yang dilihat pengguna berbahasa Indonesia, termasuk
 * pesan bawaan framework (validasi, 401, 404, kredensial salah).
 */
class IndonesianApiMessagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_request_gets_an_indonesian_message(): void
    {
        $this->getJson('/api/notifications/unread-count')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Sesi Anda telah berakhir. Silakan masuk kembali.');
    }

    public function test_empty_login_gets_indonesian_validation_messages(): void
    {
        $this->postJson('/login', [])
            ->assertUnprocessable()
            ->assertJsonPath('errors.username.0', 'Username wajib diisi.')
            ->assertJsonPath('errors.password.0', 'Kata sandi wajib diisi.');
    }

    public function test_wrong_credentials_get_an_indonesian_message(): void
    {
        User::factory()->create(['username' => 'warga01']);

        $this->postJson('/login', ['username' => 'warga01', 'password' => 'salah-sekali'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.username.0', 'Username atau kata sandi salah.');
    }

    public function test_unknown_api_route_gets_an_indonesian_not_found_message(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/tidak-ada-endpoint-ini')
            ->assertNotFound()
            ->assertJsonPath('message', 'Data tidak ditemukan.');
    }
}
