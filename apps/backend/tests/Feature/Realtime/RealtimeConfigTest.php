<?php

namespace Tests\Feature\Realtime;

use Tests\TestCase;

/**
 * GET /api/realtime/config: konfigurasi Laravel Echo untuk browser, sekaligus
 * saklar mati realtime (enabled=false -> frontend tetap polling).
 */
class RealtimeConfigTest extends TestCase
{
    private function enableReverb(array $client = []): void
    {
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'public-key',
            'broadcasting.connections.reverb.secret' => 'rahasia',
            'sid.realtime.client_host' => $client['host'] ?? null,
            'sid.realtime.client_port' => $client['port'] ?? null,
            'sid.realtime.client_scheme' => $client['scheme'] ?? null,
        ]);
    }

    public function test_disabled_when_broadcasting_is_not_reverb(): void
    {
        config([
            'broadcasting.default' => 'null',
            'broadcasting.connections.reverb.key' => 'public-key',
        ]);

        $this->getJson('/api/realtime/config')
            ->assertOk()
            ->assertExactJson(['data' => [
                'enabled' => false,
                'key' => null,
                'host' => null,
                'port' => null,
                'scheme' => null,
            ]]);
    }

    public function test_disabled_when_reverb_key_is_empty(): void
    {
        $this->enableReverb();
        config(['broadcasting.connections.reverb.key' => '']);

        $this->getJson('/api/realtime/config')
            ->assertOk()
            ->assertJsonPath('data.enabled', false)
            ->assertJsonPath('data.key', null);
    }

    public function test_same_origin_when_client_address_is_not_configured(): void
    {
        $this->enableReverb();

        $this->getJson('/api/realtime/config')
            ->assertOk()
            ->assertExactJson(['data' => [
                'enabled' => true,
                'key' => 'public-key',
                'host' => null,
                'port' => null,
                'scheme' => null,
            ]]);
    }

    public function test_returns_explicit_client_address_for_local_development(): void
    {
        $this->enableReverb(['host' => '127.0.0.1', 'port' => '8080', 'scheme' => 'http']);

        $this->getJson('/api/realtime/config')
            ->assertOk()
            ->assertExactJson(['data' => [
                'enabled' => true,
                'key' => 'public-key',
                'host' => '127.0.0.1',
                'port' => 8080,
                'scheme' => 'http',
            ]]);
    }

    public function test_never_exposes_the_reverb_secret(): void
    {
        $this->enableReverb();

        $this->assertStringNotContainsString(
            'rahasia',
            (string) $this->getJson('/api/realtime/config')->getContent(),
        );
    }
}
