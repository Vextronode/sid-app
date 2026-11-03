<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Notifikasi permintaan akun warga yang diputuskan petugas wilayah:
 * - ke petugas pemegangnya saat warga mendaftar akun
 *   (account_registration_submitted) atau meminta ganti foto profil
 *   (profile_photo_requested);
 * - ke warga saat permintaan ganti fotonya diputuskan
 *   (profile_photo_approved / profile_photo_rejected).
 *
 * Pendaftar akun belum bisa masuk, jadi keputusan aktivasi dibacanya lewat
 * pesan di halaman login, bukan notifikasi.
 */
class AccountApprovalNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<string, int|string>  $context  ID permintaan, mis. ['account_registration_id' => 7].
     */
    public function __construct(
        protected string $title,
        protected string $message,
        protected string $status,
        protected array $context,
    ) {
        $this->afterCommit();
    }

    /**
     * @return array<string, string>
     */
    public function viaConnections(): array
    {
        return ['database' => 'sync'];
    }

    public function via(object $notifiable): array
    {
        return ['database', WebPushChannel::class];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'category' => 'pelayanan',
            'icon' => 'user',
            'color' => 'blue',
            'context' => ['status' => $this->status, ...$this->context],
        ];
    }

    public function toWebPush(object $notifiable, self $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title($this->title)
            ->body($this->message)
            ->data([
                'category' => 'pelayanan',
                'icon' => 'user',
                'color' => 'blue',
                'context' => ['status' => $this->status, ...$this->context],
            ]);
    }
}
