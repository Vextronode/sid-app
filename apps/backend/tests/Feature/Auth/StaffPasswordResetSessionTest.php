<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Temuan #10: reset kata sandi oleh Staf tidak mencabut sesi secara
 * eksplisit. Test ini membuktikan sesi lama tetap gugur, karena middleware
 * AuthenticateSession milik Sanctum (lewat EnsureFrontendRequestsAreStateful)
 * menyimpan hash kata sandi di sesi dan mengeluarkan sesi yang hash-nya
 * sudah tidak cocok.
 */
class StaffPasswordResetSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_password_reset_ends_the_target_existing_session(): void
    {
        $village = Village::factory()->create();
        $staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $village->id]);
        $target = User::factory()->create([
            'role' => 'warga',
            'village_id' => $village->id,
            'username' => 'budi',
            'password' => 'RahasiaLama123!',
        ]);
        // Permintaan dari SPA (domain stateful): Sanctum memakai sesi login.
        // Domain ditetapkan di sini supaya tidak bergantung pada isi .env.
        config(['sanctum.stateful' => ['spa.test']]);
        $spa = ['Referer' => 'http://spa.test/'];

        $this->postJson('/login', ['username' => 'budi', 'password' => 'RahasiaLama123!'])->assertSuccessful();
        $this->withHeaders($spa)->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.id', $target->id);

        // Staf mengatur ulang kata sandi target dari perangkatnya sendiri:
        // tanpa header dan sesi milik target.
        $this->app['auth']->forgetGuards();
        $this->flushHeaders();
        $this->actingAs($staf)->postJson("/api/users/{$target->id}/reset-password")->assertOk();

        // Permintaan berikutnya dari sesi lama target ditolak.
        $this->app['auth']->forgetGuards();
        $this->withHeaders($spa)->getJson('/api/user')->assertUnauthorized();
    }
}
