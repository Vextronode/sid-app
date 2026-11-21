<?php

namespace Tests\Concerns;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Testing\TestResponse;

/**
 * Test memakai BROADCAST_CONNECTION=null (phpunit.xml), dan driver null
 * tidak menjalankan otorisasi channel. Trait ini mengganti broadcaster ke
 * reverb dengan kredensial palsu (tanpa koneksi jaringan: tanda tangan
 * channel private dihitung lokal) lalu mendaftarkan ulang routes/channels.php,
 * karena channel tercatat pada driver yang aktif saat aplikasi boot.
 */
trait UsesReverbBroadcaster
{
    protected const REVERB_TEST_KEY = 'test-key';

    protected function useReverbBroadcaster(): void
    {
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => self::REVERB_TEST_KEY,
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app',
            'broadcasting.connections.reverb.options.host' => '127.0.0.1',
            'broadcasting.connections.reverb.options.port' => 8080,
            'broadcasting.connections.reverb.options.scheme' => 'http',
            'broadcasting.connections.reverb.options.useTLS' => false,
        ]);

        Broadcast::forgetDrivers();

        require base_path('routes/channels.php');
    }

    /**
     * POST /api/broadcasting/auth seperti yang dikirim Laravel Echo.
     */
    protected function authorizeChannel(string $channelName): TestResponse
    {
        return $this->postJson('/api/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => $channelName,
        ]);
    }
}
