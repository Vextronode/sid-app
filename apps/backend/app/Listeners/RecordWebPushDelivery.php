<?php

namespace App\Listeners;

use App\Models\PushSubscription;
use NotificationChannels\WebPush\Events\NotificationFailed;
use NotificationChannels\WebPush\Events\NotificationSent;

/**
 * Mencatat hasil pengiriman Web Push per perangkat untuk menu Pelanggan
 * Notifikasi: last_success_at saat berhasil, last_failed_at saat gagal.
 *
 * Langganan kedaluwarsa (404/410) sudah dihapus package sebelum
 * NotificationFailed dikirim; update by id di bawah tidak menemukan baris
 * sehingga tidak menghidupkannya kembali. Update lewat query dasar agar
 * updated_at (waktu langganan diperbarui) tidak ikut berubah.
 */
class RecordWebPushDelivery
{
    public function handleSent(NotificationSent $event): void
    {
        $this->touch($event->subscription->getKey(), 'last_success_at');
    }

    public function handleFailed(NotificationFailed $event): void
    {
        $this->touch($event->subscription->getKey(), 'last_failed_at');
    }

    private function touch(mixed $subscriptionId, string $column): void
    {
        if ($subscriptionId === null) {
            return;
        }

        PushSubscription::query()
            ->whereKey($subscriptionId)
            ->toBase()
            ->update([$column => now()]);
    }
}
