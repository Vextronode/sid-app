<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Notifikasi ke Staf SIDUTama saat warga tanpa email mengajukan atur ulang
 * kata sandi (password_reset_requested). Pengaju belum login, jadi
 * keputusan staf dibaca pengaju lewat halaman lupa kata sandi, bukan notif.
 */
class PasswordResetRequestNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected string $title,
        protected string $message,
        protected string $status,
        protected int $requestId,
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
            'icon' => 'key',
            'color' => 'blue',
            'context' => [
                'status' => $this->status,
                'password_reset_request_id' => $this->requestId,
            ],
        ];
    }

    public function toWebPush(object $notifiable, self $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title($this->title)
            ->body($this->message)
            ->data([
                'category' => 'pelayanan',
                'icon' => 'key',
                'color' => 'blue',
                'context' => [
                    'status' => $this->status,
                    'password_reset_request_id' => $this->requestId,
                ],
            ]);
    }
}
