<?php

namespace App\Notifications;

use App\Models\Letter;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class LetterStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected Letter $letter,
        protected string $title,
        protected string $message,
        protected string $status,
    ) {
        // Notifikasi dibuat di dalam transaksi surat; jangan dikirim
        // sebelum datanya benar-benar tersimpan.
        $this->afterCommit();
    }

    /**
     * Notifikasi in-app tetap ditulis langsung supaya tidak bergantung
     * pada queue worker; hanya web push (HTTP keluar ke layanan push
     * browser) yang diantrekan agar tidak menahan request submit/approve.
     *
     * @return array<string, string>
     */
    public function viaConnections(): array
    {
        return ['database' => 'sync'];
    }

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
                'is_applicant' => $this->isApplicant($notifiable),
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
                // Dibuka saat notifikasi push diklik; frontend meneruskan
                // ke daftar surat sesuai peran penerima.
                'url' => '/buka-notifikasi?'.http_build_query([
                    'surat' => $this->letter->id,
                    'status' => $this->status,
                    'mine' => $this->isApplicant($notifiable) ? 1 : 0,
                ]),
                'category' => 'pelayanan',
                'icon' => $this->resolveIcon(),
                'color' => $this->resolveColor(),
                'context' => [
                    'letter_id' => $this->letter->id,
                    'letter_no' => $this->letter->letter_number,
                    'status' => $this->status,
                    'applicant' => $this->letter->applicant_name,
                    'is_applicant' => $this->isApplicant($notifiable),
                ],
            ]);
    }

    /**
     * Penerima adalah pemohon surat ini. Frontend memakainya untuk membuka
     * surat di "Surat Saya" bagi pejabat yang mengajukan surat pribadi.
     */
    private function isApplicant(object $notifiable): bool
    {
        return (string) ($notifiable->id ?? '') === (string) $this->letter->submitted_by;
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
