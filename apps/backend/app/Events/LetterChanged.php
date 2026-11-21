<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Sinyal realtime "surat berubah" (diajukan, berpindah tahap, diputuskan,
 * diterbitkan, dihapus), dikirim LetterRealtimeObserver.
 *
 * Ke `letters.staff` (semua akun non-warga) dan ke channel akun pemohon.
 * Hanya id surat: tiap penerima mengambil ulang daftarnya sendiri lewat
 * GET /api/letters, yang tetap menyaring sesuai wilayah dan perannya, jadi
 * pejabat yang tidak berhak atas surat itu tidak melihat apa pun yang baru.
 *
 * ShouldRescue: Reverb yang tidak terjangkau tidak menggagalkan aksi atas
 * surat (mis. saat QUEUE_CONNECTION=sync); galatnya hanya dilaporkan ke log.
 */
class LetterChanged implements ShouldBroadcast, ShouldDispatchAfterCommit, ShouldRescue
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly string $letterId,
        public readonly ?string $requesterId = null,
    ) {}

    /**
     * @return list<PrivateChannel>
     */
    public function broadcastOn(): array
    {
        $channels = [new PrivateChannel('letters.staff')];

        if ($this->requesterId !== null) {
            $channels[] = new PrivateChannel('App.Models.User.'.$this->requesterId);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'letter.changed';
    }

    /**
     * @return array{type: string, id: string}
     */
    public function broadcastWith(): array
    {
        return ['type' => 'letter', 'id' => $this->letterId];
    }
}
