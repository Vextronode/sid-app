<?php

namespace App\Notifications;

use App\Enums\CimartApplicationStatus;
use App\Models\CitizenBusiness;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Hasil pendaftaran pedagang Cimart untuk warga pemilik usaha: akun pedagang
 * dibuat (cimart_accepted) atau ditolak beserta alasan dari Cimart
 * (cimart_rejected). Dibuka di bagian Usaha Saya pada halaman profil.
 */
class CimartApplicationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    private string $status;

    private string $title;

    private string $message;

    /** @var array{status: string, business_id: string} */
    private array $context;

    public function __construct(CitizenBusiness $business)
    {
        $accepted = $business->cimart_status === CimartApplicationStatus::Accepted;

        // Isi disalin saat dibuat: alasan penolakan bisa berganti bila warga
        // mendaftar ulang sebelum antrean berjalan.
        $this->status = $accepted ? 'cimart_accepted' : 'cimart_rejected';
        $this->title = $accepted ? 'Akun Pedagang Cimart Dibuat' : 'Pendaftaran Cimart Ditolak';
        $this->message = $accepted
            ? "Usaha {$business->business_name} sudah terdaftar sebagai pedagang Cimart. Cek email usaha Anda untuk mengaktifkan akun."
            : "Pendaftaran {$business->business_name} ke Cimart ditolak. Alasan: {$business->cimart_note}";
        $this->context = ['status' => $this->status, 'business_id' => $business->id];

        // Dikirim hanya bila status benar-benar tersimpan.
        $this->afterCommit();
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
            'category' => 'pelayanan',
            'icon' => 'store',
            'color' => $this->color(),
            'context' => $this->context,
        ];
    }

    public function toWebPush(object $notifiable, self $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title($this->title)
            ->body($this->message)
            ->tag('cimart-'.$this->context['business_id'])
            ->data([
                // Halaman perantara meneruskan ke profil sesuai peran penerima.
                'url' => '/buka-notifikasi?'.http_build_query(['status' => $this->status]),
                'category' => 'pelayanan',
                'icon' => 'store',
                'color' => $this->color(),
                'context' => $this->context,
            ]);
    }

    private function color(): string
    {
        return $this->status === 'cimart_accepted' ? 'green' : 'red';
    }
}
