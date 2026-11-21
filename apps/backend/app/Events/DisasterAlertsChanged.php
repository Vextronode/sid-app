<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Sinyal realtime "peringatan bencana berubah": diterima dari SIGAP,
 * diperbarui, diakhiri, diturunkan, atau ditampilkan lagi oleh staf.
 *
 * Channel publik (`disaster-alerts`) karena bar peringatan tampil untuk
 * pengunjung tanpa login; tab Peringatan SIGAP milik staf memakai sinyal
 * yang sama. Isinya hanya jenis + id; data diambil ulang lewat
 * GET /api/public/disaster-alerts atau GET /api/disaster-alerts dengan
 * aturan aksesnya masing-masing.
 *
 * ShouldRescue: Reverb yang tidak terjangkau tidak menggagalkan penerimaan
 * dari SIGAP maupun aksi staf (mis. saat QUEUE_CONNECTION=sync); galatnya
 * hanya dilaporkan ke log.
 */
class DisasterAlertsChanged implements ShouldBroadcast, ShouldDispatchAfterCommit, ShouldRescue
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public readonly string $alertId) {}

    /**
     * @return list<Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel('disaster-alerts')];
    }

    public function broadcastAs(): string
    {
        return 'disaster-alerts.changed';
    }

    /**
     * @return array{type: string, id: string}
     */
    public function broadcastWith(): array
    {
        return ['type' => 'disaster_alert', 'id' => $this->alertId];
    }
}
