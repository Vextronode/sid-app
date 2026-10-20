<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * POST /villages/profile/resolve-map-link: titik kantor desa dari link
 * Google Maps (link panjang atau short link maps.app.goo.gl).
 */
class VillageMapLinkTest extends TestCase
{
    use RefreshDatabase;

    private const SHORT_LINK = 'https://maps.app.goo.gl/sVU5Xqmasq4UTJ4N6';

    // Tujuan redirect short link di atas (diambil dari Google Maps).
    private const PLACE_URL = 'https://www.google.com/maps/place/Kantor+Pemerintahan+Desa+Cibenda/@-7.6803137,108.5488067,17z/data=!3m1!4b1!4m6!3m5!1s0x2e6597ce7a85b9bf:0x11f7e1dbf2134b4f!8m2!3d-7.6803137!4d108.5513816!16s%2Fg%2F11j01n5vrh';

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
    }

    private function staf(string $role = 'staf_sid'): User
    {
        $village = Village::query()->firstOrCreate(['code' => 'CBD'], ['name' => 'Desa Cibenda']);

        return User::factory()->create(['village_id' => $village->id, 'role' => $role]);
    }

    private function resolve(string $url, ?User $user = null)
    {
        return $this->actingAs($user ?? $this->staf())
            ->postJson('/api/villages/profile/resolve-map-link', ['url' => $url]);
    }

    #[Test]
    public function short_link_resolves_to_the_place_pin(): void
    {
        Http::fake([
            'maps.app.goo.gl/*' => Http::response('', 302, ['Location' => self::PLACE_URL]),
        ]);

        // Pin tempat (!3d/!4d), bukan pusat tampilan peta (@...,108.5488067).
        $this->resolve(self::SHORT_LINK)
            ->assertOk()
            ->assertExactJson(['data' => ['latitude' => -7.6803137, 'longitude' => 108.5513816]]);

        Http::assertSentCount(1);
    }

    #[Test]
    public function long_link_is_read_without_a_network_request(): void
    {
        $this->resolve('https://www.google.com/maps/@-7.68,108.55,17z')
            ->assertOk()
            ->assertExactJson(['data' => ['latitude' => -7.68, 'longitude' => 108.55]]);

        $this->resolve('https://www.google.com/maps/search/?api=1&query=-7.6803137%2C108.5513816')
            ->assertOk()
            ->assertJsonPath('data.latitude', -7.6803137);

        Http::assertNothingSent();
    }

    #[Test]
    public function google_consent_redirect_still_yields_the_point(): void
    {
        $consent = 'https://consent.google.com/m?continue='.rawurlencode(self::PLACE_URL);
        Http::fake([
            'maps.app.goo.gl/*' => Http::response('', 302, ['Location' => $consent]),
        ]);

        $this->resolve(self::SHORT_LINK)
            ->assertOk()
            ->assertJsonPath('data.longitude', 108.5513816);

        Http::assertSentCount(1);
    }

    #[Test]
    public function non_google_hosts_are_never_requested(): void
    {
        $this->resolve('https://example.com/maps/@-7.68,108.55,17z')->assertStatus(422);
        $this->resolve('http://www.google.com/maps/@-7.68,108.55,17z')->assertStatus(422);
        $this->resolve('https://www.google.com.evil.test/maps/@-7.68,108.55,17z')->assertStatus(422);

        Http::assertNothingSent();
    }

    #[Test]
    public function redirect_to_another_host_is_not_followed(): void
    {
        Http::fake([
            'maps.app.goo.gl/*' => Http::response('', 302, ['Location' => 'http://169.254.169.254/latest/meta-data']),
        ]);

        $this->resolve(self::SHORT_LINK)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['url']);

        Http::assertSent(fn (Request $request) => str_starts_with($request->url(), self::SHORT_LINK));
        Http::assertSentCount(1);
    }

    #[Test]
    public function link_without_a_point_is_rejected(): void
    {
        Http::fake([
            'maps.app.goo.gl/*' => Http::response('Not found', 404),
            // Halaman tempat tanpa titik di URL dan tanpa redirect.
            'www.google.com/*' => Http::response('<html></html>', 200),
        ]);

        $this->resolve(self::SHORT_LINK)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Titik lokasi tidak ditemukan dari link ini. Pastikan link dari Google Maps, atau tempel koordinatnya langsung.');

        $this->resolve('https://www.google.com/maps/place/Cibenda')->assertStatus(422);
    }

    #[Test]
    public function only_staf_sid_can_resolve_links(): void
    {
        $this->resolve(self::SHORT_LINK, $this->staf('kepala_desa'))->assertStatus(403);

        Http::assertNothingSent();
    }

    #[Test]
    public function guests_cannot_resolve_links(): void
    {
        $this->postJson('/api/villages/profile/resolve-map-link', ['url' => self::SHORT_LINK])
            ->assertStatus(401);

        Http::assertNothingSent();
    }

    #[Test]
    public function url_is_required(): void
    {
        $this->actingAs($this->staf())
            ->postJson('/api/villages/profile/resolve-map-link', ['url' => 'bukan url'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['url']);
    }
}
