<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Email tautan atur ulang kata sandi (lupa password via email).
 * URL tujuan tetap dibentuk oleh ResetPassword::createUrlUsing di
 * AppServiceProvider (halaman frontend /reset-password/{token}).
 */
class ResetPasswordNotification extends ResetPassword
{
    protected function buildMailMessage($url): MailMessage
    {
        $expire = config('auth.passwords.'.config('auth.defaults.passwords').'.expire');

        return (new MailMessage)
            ->subject('Atur Ulang Kata Sandi '.config('sid.app_name'))
            ->greeting('Halo!')
            ->line('Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda.')
            ->action('Buat Kata Sandi Baru', $url)
            ->line("Tautan ini berlaku selama {$expire} menit.")
            ->line('Jika Anda tidak merasa meminta atur ulang kata sandi, abaikan email ini. Kata sandi Anda tidak akan berubah.')
            ->salutation('Salam, '.config('sid.app_name'));
    }
}
