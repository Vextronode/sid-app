<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private const GENERIC_STATUS = 'Jika email tersebut terdaftar, tautan atur ulang kata sandi sudah dikirim. Periksa kotak masuk atau folder spam Anda.';

    public function test_reset_password_link_can_be_requested(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->postJson('/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertJson(['status' => self::GENERIC_STATUS]);

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_reset_link_points_to_frontend_page_with_encoded_email(): void
    {
        Notification::fake();
        config(['app.frontend_url' => 'http://localhost:5173']);

        $user = User::factory()->create(['email' => 'warga+desa@example.test']);

        $this->postJson('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $notification) use ($user) {
            $mail = $notification->toMail($user);

            $this->assertSame(
                "http://localhost:5173/reset-password/{$notification->token}?email=warga%2Bdesa%40example.test",
                $mail->actionUrl,
            );
            $this->assertSame('Buat Kata Sandi Baru', $mail->actionText);

            return true;
        });
    }

    public function test_unknown_email_gets_the_same_response_without_sending_anything(): void
    {
        Notification::fake();

        User::factory()->withoutEmail()->create();

        $this->postJson('/forgot-password', ['email' => 'unknown@example.test'])
            ->assertOk()
            ->assertJson(['status' => self::GENERIC_STATUS]);

        Notification::assertNothingSent();
    }

    public function test_inactive_account_does_not_receive_reset_link(): void
    {
        Notification::fake();

        $user = User::factory()->create(['is_active' => false]);

        $this->postJson('/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertJson(['status' => self::GENERIC_STATUS]);

        Notification::assertNotSentTo($user, ResetPasswordNotification::class);
    }

    public function test_email_is_required_and_must_be_valid(): void
    {
        $this->postJson('/forgot-password', ['email' => 'bukan-email'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_password_can_be_reset_with_valid_token(): void
    {
        Notification::fake();

        $user = User::factory()->create(['must_change_password' => true]);
        $user->createToken('perangkat-lama');

        $this->postJson('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $notification) use ($user) {
            $this->postJson('/reset-password', [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'KataSandiBaru123!',
                'password_confirmation' => 'KataSandiBaru123!',
            ])->assertOk();

            return true;
        });

        $user->refresh();

        $this->assertTrue(Hash::check('KataSandiBaru123!', $user->password));
        $this->assertFalse($user->must_change_password);
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_password_cannot_be_reset_with_invalid_token(): void
    {
        $user = User::factory()->create();

        $this->postJson('/reset-password', [
            'token' => 'token-palsu',
            'email' => $user->email,
            'password' => 'KataSandiBaru123!',
            'password_confirmation' => 'KataSandiBaru123!',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertFalse(Hash::check('KataSandiBaru123!', $user->refresh()->password));
    }

    public function test_password_cannot_be_reset_after_account_is_deactivated(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->postJson('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $notification) use ($user) {
            $user->forceFill(['is_active' => false])->save();

            $this->postJson('/reset-password', [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'KataSandiBaru123!',
                'password_confirmation' => 'KataSandiBaru123!',
            ])->assertUnprocessable();

            return true;
        });

        $this->assertFalse(Hash::check('KataSandiBaru123!', $user->refresh()->password));
    }
}
