<?php

namespace App\Listeners;

use App\Events\NotificationCreated;
use App\Models\User;
use App\Notifications\Contracts\BroadcastsInBulk;
use Illuminate\Notifications\Events\NotificationSent;

/**
 * Setiap notifikasi in-app (kanal `database`) yang tersimpan diikuti sinyal
 * realtime ke penerimanya, tanpa mengubah kelas notifikasi satu per satu.
 * Kanal lain (Web Push, mail) diabaikan; notifikasi massal (BroadcastsInBulk)
 * dikirim sinyalnya oleh pengirimnya per kelompok.
 */
class BroadcastNewDatabaseNotification
{
    public function handle(NotificationSent $event): void
    {
        if (
            $event->channel !== 'database'
            || ! $event->notifiable instanceof User
            || $event->notification instanceof BroadcastsInBulk
        ) {
            return;
        }

        NotificationCreated::dispatch(
            [(string) $event->notifiable->getKey()],
            $event->notification->id,
        );
    }
}
