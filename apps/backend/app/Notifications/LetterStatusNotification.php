<?php

namespace App\Notifications;

use App\Models\Letter;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class LetterStatusNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected Letter $letter,
        protected string $title,
        protected string $message,
        protected string $status,
    ) {}

    /**
     * Notifikasi berjalan beriringan di dua kanal: 'database' (in-app,
     * dibaca lewat GET /notifications) dan WebPushChannel (push browser
     * saat tab/aplikasi tidak aktif). Kegagalan kirim push (mis. user
     * belum pernah subscribe, atau subscription sudah kedaluwarsa)
     * tidak memengaruhi notifikasi database - keduanya independen.
     */
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

            'icon' => $this->resolveIcon(),

            'color' => $this->resolveColor(),

            'context' => [

                'letter_id' => $this->letter->id,

                'letter_no' => $this->letter->letter_number,

                'status' => $this->status,

                'applicant' => $this->letter->applicant_name,
            ],

        ];
    }

    public function toWebPush(object $notifiable, self $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title($this->title)
            ->body($this->message)
            ->tag("letter-{$this->letter->id}")
            ->data([
                'category' => 'pelayanan',
                'icon' => $this->resolveIcon(),
                'color' => $this->resolveColor(),
                'context' => [
                    'letter_id' => $this->letter->id,
                    'letter_no' => $this->letter->letter_number,
                    'status' => $this->status,
                    'applicant' => $this->letter->applicant_name,
                ],
            ]);
    }

    private function resolveIcon(): string
    {
        return match ($this->status) {

            'kasi_approved',
            'letter_approved_final' => 'signature',

            'waiting_revision_warga' => 'edit',

            'letter_ready_for_print' => 'document',

            default => 'document',
        };
    }

    private function resolveColor(): string
    {
        return match ($this->status) {

            'rt_approved',
            'rw_approved' => 'blue',

            'kasi_approved',
            'letter_approved_final' => 'green',

            'letter_ready_for_print' => 'blue',

            'waiting_revision_warga' => 'amber',

            'rt_rejected',
            'rw_rejected',
            'kasi_rejected' => 'red',

            default => 'gray',
        };
    }
}
