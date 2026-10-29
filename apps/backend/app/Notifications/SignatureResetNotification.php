<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Notifikasi alur pengajuan reset tanda tangan: masuk ke Staf SIDUTama
 * (signature_reset_requested) dan keputusan ke pemilik akun
 * (signature_reset_approved / signature_reset_rejected).
 */
class SignatureResetNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected string $title,
        protected string $message,
        protected string $status,
        protected string $color = 'blue',
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
            'icon' => 'signature',
            'color' => $this->color,
            'context' => ['status' => $this->status],
        ];
    }

    public function toWebPush(object $notifiable, self $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title($this->title)
            ->body($this->message)
            ->data([
                'category' => 'pelayanan',
                'icon' => 'signature',
                'color' => $this->color,
                'context' => ['status' => $this->status],
            ]);
    }
}
