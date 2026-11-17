<?php

namespace App\Notifications;

use App\Models\DisasterAlert;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Peringatan bencana dari SIGAP untuk semua akun aktif di desa, dikirim
 * SendDisasterAlertNotifications saat peringatan baru tampil atau levelnya
 * naik. Diklik membuka beranda publik, tempat bar peringatan tampil.
 */
class DisasterAlertNotification extends Notification implements ShouldQueue
{
    use Queueable;

    private string $alertId;

    private string $level;

    private string $title;

    private string $message;

    private int $ttlSeconds;

    public function __construct(DisasterAlert $alert)
    {
        // Isi disalin, bukan model: peringatan bisa sudah dihapus atau
        // berubah saat antrean push berjalan.
        $this->alertId = $alert->id;
        $this->level = $alert->level->value;
        $this->title = Str::upper($alert->level->label()).': '.$alert->title;
        $this->message = Str::limit(
            $alert->message ?: trim($alert->type->label().($alert->location ? " di {$alert->location}" : '')),
            200,
        );
        // Push yang belum terkirim tidak berguna setelah masa tayang habis.
        $this->ttlSeconds = max(60, (int) now()->diffInSeconds($alert->expires_at, false));
    }

    /**
     * Notifikasi in-app ditulis langsung; hanya web push yang diantrekan.
     *
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
            'category' => 'informasi',
            'icon' => 'alert',
            'color' => 'red',
            'context' => $this->context(),
        ];
    }

    public function toWebPush(object $notifiable, self $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title($this->title)
            ->body($this->message)
            // Kenaikan level menggantikan push sebelumnya untuk peringatan yang sama.
            ->tag('disaster-alert-'.$this->alertId)
            ->renotify()
            ->requireInteraction()
            ->options(['urgency' => 'high', 'TTL' => $this->ttlSeconds])
            ->data([
                'url' => '/',
                'category' => 'informasi',
                'icon' => 'alert',
                'color' => 'red',
                'context' => $this->context(),
            ]);
    }

    /**
     * @return array{status: string, alert_id: string, level: string}
     */
    private function context(): array
    {
        return ['status' => 'disaster_alert', 'alert_id' => $this->alertId, 'level' => $this->level];
    }
}
