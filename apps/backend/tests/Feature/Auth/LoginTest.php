<?php

namespace Tests\Feature\Auth;

use App\Models\Official;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_log_in_with_case_insensitive_username_and_receives_active_official_profile(): void
    {
        $user = User::factory()->create([
            'username' => 'siti.1234',
            'role' => 'rt',
            'must_change_password' => true,
        ]);
        $official = Official::factory()->forUser($user)->position('rt')->create();

        $response = $this->postJson('/login', [
            'username' => '  SITI.1234 ',
            'password' => 'Password123',
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Login berhasil')
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.role', 'rt')
            ->assertJsonPath('user.official.id', $official->id)
            ->assertJsonPath('user.must_change_password', true);
        $this->assertAuthenticatedAs($user);
    }

    public function test_password_must_be_correct(): void
    {
        User::factory()->create(['username' => 'warga.1234']);

        $this->post('/login', [
            'username' => 'warga.1234',
            'password' => 'wrong-password',
        ])->assertRedirect()->assertSessionHasErrors('username');

        $this->assertGuest();
    }

    public function test_inactive_account_is_rejected_only_after_correct_password(): void
    {
        User::factory()->inactive()->create(['username' => 'nonaktif.1234']);

        $this->post('/login', [
            'username' => 'nonaktif.1234',
            'password' => 'wrong-password',
        ])->assertRedirect()->assertSessionHasErrors('username');
        $this->assertGuest();

        $this->post('/login', [
            'username' => 'nonaktif.1234',
            'password' => 'Password123',
        ])->assertForbidden()
            ->assertSeeText('Akun tidak aktif, hubungi administrator');
        $this->assertGuest();
    }

    public function test_login_is_rate_limited_after_five_failed_attempts(): void
    {
        User::factory()->create(['username' => 'limit.1234']);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->post('/login', [
                'username' => 'limit.1234',
                'password' => 'wrong-password',
            ])->assertRedirect()->assertSessionHasErrors('username');
        }

        $this->post('/login', [
            'username' => 'limit.1234',
            'password' => 'wrong-password',
        ])->assertRedirect()->assertSessionHasErrors('username');
    }

    public function test_lockout_after_five_failed_attempts_lasts_one_hour(): void
    {
        User::factory()->create(['username' => 'lockout.1234']);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->post('/login', [
                'username' => 'lockout.1234',
                'password' => 'wrong-password',
            ]);
        }

        $throttleKey = Str::transliterate(Str::lower('lockout.1234').'|127.0.0.1');

        $this->assertTrue(RateLimiter::tooManyAttempts($throttleKey, 5));
        $this->assertGreaterThan(3500, RateLimiter::availableIn($throttleKey));
        $this->assertLessThanOrEqual(3600, RateLimiter::availableIn($throttleKey));
    }

    public function test_lockout_blocks_login_even_with_correct_password(): void
    {
        $user = User::factory()->create(['username' => 'lockout2.1234']);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->post('/login', [
                'username' => 'lockout2.1234',
                'password' => 'wrong-password',
            ]);
        }

        $this->post('/login', [
            'username' => 'lockout2.1234',
            'password' => 'Password123',
        ])->assertRedirect()->assertSessionHasErrors('username');

        $this->assertGuest();
        $this->assertNotEquals($user->id, auth()->id());
    }
}
