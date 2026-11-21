<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Sinyal realtime "ada notifikasi baru" ke channel private penerima.
 *
 * Hanya sinyal: frontend meng-invalidate cache notifikasi lalu mengambil
 * ulang lewat GET /api/notifications, jadi judul/isi notifikasi tidak ikut
 * dikirim. Lewat antrean (sid_worker) dan setelah transaksi selesai, supaya
 * Reverb yang mati tidak menggagalkan aksi pengguna dan sinyal tidak
 * mendahului baris notifikasinya. ShouldRescue: bila broadcast tetap gagal
 * di dalam request (QUEUE_CONNECTION=sync), galatnya hanya dilaporkan ke log.
 *
 * Satu event bisa menuju banyak akun sekaligus (pengiriman massal,
 * lihat BroadcastsInBulk); broadcaster memecahnya per 100 channel.
 */
class NotificationCreated implements ShouldBroadcast, ShouldDispatchAfterCommit, ShouldRescue
{
    use Dispatchable, InteractsWithSockets;

    /**
     * @param  list<string>  $userIds  akun penerima
     * @param  string|null  $notificationId  id notifikasi bila penerimanya satu
     */
    public function __construct(
        public readonly array $userIds,
        public readonly ?string $notificationId = null,
    ) {}

    /**
     * @return list<PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return array_map(
            fn (string $userId) => new PrivateChannel('App.Models.User.'.$userId),
            $this->userIds,
        );
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    /**
     * @return array{type: string, id: string|null}
     */
    public function broadcastWith(): array
    {
        return ['type' => 'notification', 'id' => $this->notificationId];
    }
}
