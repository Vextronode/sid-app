<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/**
 * Konfigurasi Laravel Echo untuk browser (GET /api/realtime/config, publik).
 *
 * Image sid-web dibangun sekali tanpa env per lingkungan, jadi alamat dan
 * app key Reverb dibaca saat runtime dari sini. `enabled=false` adalah
 * saklar mati: frontend tidak membuka WebSocket dan tetap polling.
 * App key Reverb memang publik (seperti key Pusher); secret tidak pernah
 * dikirim. host/port/scheme `null` = ikut origin halaman.
 */
class RealtimeConfigController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $key = config('broadcasting.connections.reverb.key');
        $enabled = config('broadcasting.default') === 'reverb' && filled($key);
        $port = config('sid.realtime.client_port');

        return response()->json([
            'data' => [
                'enabled' => $enabled,
                'key' => $enabled ? (string) $key : null,
                'host' => $enabled ? config('sid.realtime.client_host') : null,
                'port' => $enabled && filled($port) ? (int) $port : null,
                'scheme' => $enabled ? config('sid.realtime.client_scheme') : null,
            ],
        ]);
    }
}
