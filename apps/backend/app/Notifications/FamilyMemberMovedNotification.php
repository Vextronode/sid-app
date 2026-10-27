<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Pemberitahuan ke kepala keluarga bahwa anggota KK-nya dipindah ke KK lain
 * lewat surat orang lain (mis. pengangkatan anak berdasarkan penetapan
 * pengadilan). Tanpa tautan surat: penerima bukan pihak surat itu.
 */
class FamilyMemberMovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected string $memberName,
        protected string $reason,
    ) {
        // Dikirim hanya bila perubahan data benar-benar tersimpan.
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
            'title' => 'Susunan KK Anda Berubah',
            'message' => $this->message(),
            'category' => 'pelayanan',
            'icon' => 'document',
            'color' => 'blue',
            'context' => ['status' => 'family_member_moved'],
        ];
    }

    public function toWebPush(object $notifiable, self $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title('Susunan KK Anda Berubah')
            ->body($this->message())
            ->data(['category' => 'pelayanan', 'icon' => 'document', 'color' => 'blue', 'context' => ['status' => 'family_member_moved']]);
    }

    private function message(): string
    {
        return "{$this->memberName} dipindahkan dari KK Anda {$this->reason}. Silakan urus KK terbaru di Disdukcapil.";
    }
}
