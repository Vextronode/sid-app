<?php

namespace App\Jobs;

use App\Events\NotificationCreated;
use App\Models\DisasterAlert;
use App\Models\User;
use App\Notifications\DisasterAlertNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/**
 * Mengirim peringatan bencana ke semua akun aktif di desa, per kelompok
 * (config disaster_alerts.notification_chunk). Dijalankan lewat antrean,
 * bukan di request SIGAP: kanal `database` menulis satu baris per akun.
 *
 * Sebelum mengirim, keadaan peringatan diperiksa ulang dan
 * `notified_level_rank` serta `notified_magnitude` (patokan gempa susulan)
 * diperbarui di bawah kunci baris, jadi job yang
 * berjalan dua kali atau dua pembaruan yang berdekatan tidak mengirim dobel.
 * Peringatan yang sudah diturunkan atau diakhiri sebelum job berjalan tidak
 * dikirim.
 */
class SendDisasterAlertNotifications implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $alertId) {}

    public function handle(): void
    {
        $alert = DB::transaction(function (): ?DisasterAlert {
            $alert = DisasterAlert::query()->lockForUpdate()->find($this->alertId);

            if ($alert === null || ! $alert->needsNotification()) {
                return null;
            }

            // Level tertinggi yang pernah dikirim; magnitudo saat ini jadi
            // patokan gempa susulan berikutnya (kosong: patokan lama tetap).
            $alert->update([
                'notified_level_rank' => max($alert->level_rank, $alert->notified_level_rank ?? 0),
                'notified_magnitude' => $alert->magnitude ?? $alert->notified_magnitude,
            ]);

            return $alert;
        });

        if ($alert === null) {
            return;
        }

        $notification = new DisasterAlertNotification($alert);

        // Kanal `database` berjalan sinkron, jadi setelah send() baris
        // notifikasi satu kelompok sudah tersimpan; sinyal realtime-nya
        // dikirim sekali untuk seluruh kelompok (lihat BroadcastsInBulk).
        User::query()
            ->where('village_id', $alert->village_id)
            ->where('is_active', true)
            ->chunkById(
                (int) config('disaster_alerts.notification_chunk', 200),
                function ($users) use ($notification): void {
                    Notification::send($users, $notification);
                    NotificationCreated::dispatch(array_map('strval', $users->modelKeys()));
                },
            );
    }
}
