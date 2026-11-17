<?php

namespace Tests\Feature\Integration;

use App\Enums\DisasterAlertLevel;
use App\Enums\IntegrationAbility;
use App\Models\DisasterAlert;
use App\Models\IntegrationClient;
use App\Models\Village;
use App\Services\IntegrationClientService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

/**
 * API peringatan bencana untuk SIGAP (langkah 2), sesuai kontrak
 * docs/thirdparty/sigap/api-spec/openapi.yaml.
 */
class DisasterAlertApiTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = '/api/integrations/v1/alerts';

    private Village $village;

    private IntegrationClient $sigap;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        // Notifikasi diuji di DisasterAlertNotificationTest.
        Queue::fake();
        Carbon::setTestNow('2026-11-16 14:03:00');
        config(['disaster_alerts.link_hosts' => ['sigap.example.id']]);

        $this->village = Village::factory()->create();
        ['client' => $this->sigap, 'token' => $this->token] = $this->createClient('sigap', [IntegrationAbility::AlertsWrite->value]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_new_alert_returns_201_and_resending_the_same_data_returns_200_without_a_new_row(): void
    {
        $this->sendAlert('gempa-881', $this->payload())
            ->assertCreated()
            ->assertExactJson(['data' => [
                'external_id' => 'gempa-881',
                'status' => 'active',
                'level' => 'waspada',
                'expires_at' => '2026-11-16T20:02:00+07:00',
                'received_at' => '2026-11-16T14:03:00+07:00',
            ]]);

        $alert = DisasterAlert::query()->sole();
        $this->assertSame($this->village->id, $alert->village_id);
        $this->assertSame($this->sigap->id, $alert->integration_client_id);
        $this->assertSame(DisasterAlertLevel::Waspada->rank(), $alert->level_rank);
        $this->assertSame(5.2, $alert->magnitude);

        $this->sendAlert('gempa-881', $this->payload())
            ->assertOk()
            ->assertJsonPath('data.status', 'active');
        $this->assertSame(1, DisasterAlert::query()->count());
    }

    public function test_newer_sent_at_updates_the_alert_and_older_or_equal_is_ignored(): void
    {
        $this->sendAlert('gempa-881', $this->payload())->assertCreated();

        $this->sendAlert('gempa-881', $this->payload([
            'title' => 'Gempa M6.9 (revisi)',
            'magnitude' => 6.9,
            'level' => 'siaga',
            'sent_at' => '2026-11-16T14:05:00+07:00',
        ]))->assertOk()->assertJsonPath('data.level', 'siaga');

        $alert = DisasterAlert::query()->sole();
        $this->assertSame('Gempa M6.9 (revisi)', $alert->title);
        $this->assertSame(6.9, $alert->magnitude);
        $this->assertSame(DisasterAlertLevel::Siaga->rank(), $alert->level_rank);

        // Retry versi lama yang datang terlambat tidak menurunkan level.
        $this->sendAlert('gempa-881', $this->payload(['level' => 'info', 'sent_at' => '2026-11-16T14:04:00+07:00']))
            ->assertOk()
            ->assertJsonPath('data.level', 'siaga');
        $this->sendAlert('gempa-881', $this->payload(['level' => 'info', 'sent_at' => '2026-11-16T14:05:00+07:00']))
            ->assertOk()
            ->assertJsonPath('data.level', 'siaga');

        $this->assertSame('Gempa M6.9 (revisi)', $alert->fresh()->title);
        $this->assertSame(['stale', 'stale'], Activity::query()->where('event', 'alert_ignored')->get()->pluck('properties.reason')->all());
    }

    public function test_ended_alert_ignores_later_updates(): void
    {
        $this->sendAlert('tsunami-882', $this->payload(['type' => 'tsunami', 'level' => 'awas']))->assertCreated();
        $this->endAlert('tsunami-882')->assertOk()->assertJsonPath('data.status', 'ended');

        $this->sendAlert('tsunami-882', $this->payload([
            'type' => 'tsunami',
            'level' => 'awas',
            'title' => 'Diperbarui setelah berakhir',
            'sent_at' => '2026-11-16T15:00:00+07:00',
        ]))->assertOk()->assertJsonPath('data.status', 'ended');

        $this->assertNotSame('Diperbarui setelah berakhir', DisasterAlert::query()->sole()->title);
        $this->assertDatabaseHas('activity_log', ['event' => 'alert_ignored', 'properties->reason' => 'ended']);
    }

    public function test_dismissed_alert_stays_hidden_after_an_update(): void
    {
        $this->sendAlert('gempa-881', $this->payload())->assertCreated();
        DisasterAlert::query()->update(['dismissed_at' => now(), 'dismiss_reason' => 'Alarm palsu.']);

        $this->sendAlert('gempa-881', $this->payload(['title' => 'Gempa M6.0', 'sent_at' => '2026-11-16T14:10:00+07:00']))
            ->assertOk()
            ->assertJsonPath('data.status', 'dismissed');

        $alert = DisasterAlert::query()->sole();
        $this->assertSame('Gempa M6.0', $alert->title);
        $this->assertNotNull($alert->dismissed_at);
        $this->assertFalse($alert->isDisplayed());
    }

    public function test_expires_at_uses_the_default_is_capped_and_rejects_past_values(): void
    {
        $this->sendAlert('gempa-default', $this->payload(['expires_at' => null]))
            ->assertCreated()
            ->assertJsonPath('data.expires_at', '2026-11-16T20:03:00+07:00');

        $this->sendAlert('gempa-cap', $this->payload(['expires_at' => '2026-12-31T00:00:00+07:00']))
            ->assertCreated()
            ->assertJsonPath('data.expires_at', '2026-11-19T14:03:00+07:00');

        // Pembaruan tidak memperpanjang lewat 3 hari sejak pertama diterima.
        Carbon::setTestNow('2026-11-18 14:03:00');
        $this->sendAlert('gempa-cap', $this->payload([
            'expires_at' => '2026-12-31T00:00:00+07:00',
            'sent_at' => '2026-11-18T14:00:00+07:00',
        ]))->assertOk()->assertJsonPath('data.expires_at', '2026-11-19T14:03:00+07:00');

        $this->sendAlert('gempa-past', $this->payload(['expires_at' => '2026-11-18T10:00:00+07:00']))
            ->assertUnprocessable()
            ->assertJsonPath('errors.expires_at.0', 'Masa tayang peringatan sudah lewat.');
    }

    public function test_times_sent_in_utc_are_stored_in_the_app_timezone(): void
    {
        $this->sendAlert('gempa-utc', $this->payload([
            'occurred_at' => '2026-11-16T07:02:00Z',
            'sent_at' => '2026-11-16T07:03:00Z',
            'expires_at' => '2026-11-16T13:02:00Z',
        ]))->assertCreated()->assertJsonPath('data.expires_at', '2026-11-16T20:02:00+07:00');

        $alert = DisasterAlert::query()->sole();
        $this->assertSame('2026-11-16 14:02:00', $alert->occurred_at->format('Y-m-d H:i:s'));
        $this->assertSame('2026-11-16 14:03:00', $alert->getRawOriginal('sent_at'));
    }

    public function test_link_url_must_be_https_from_a_registered_sigap_host(): void
    {
        $this->sendAlert('gempa-a', $this->payload(['link_url' => 'https://phishing.example.com/x']))
            ->assertUnprocessable()
            ->assertJsonPath('errors.link_url.0', 'Link peringatan harus berasal dari domain SIGAP yang terdaftar.');

        $this->sendAlert('gempa-b', $this->payload(['link_url' => 'http://sigap.example.id/x']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('link_url');

        $this->sendAlert('gempa-c', $this->payload(['link_url' => 'https://SIGAP.example.id/kejadian/881']))->assertCreated();
    }

    public function test_unknown_type_or_level_and_missing_fields_are_rejected(): void
    {
        $this->sendAlert('gempa-x', $this->payload(['type' => 'banjir']))
            ->assertUnprocessable()
            ->assertJsonPath('errors.type.0', 'Jenis bencana tidak dikenal.');

        $this->sendAlert('gempa-x', $this->payload(['level' => 'merah']))
            ->assertUnprocessable()
            ->assertJsonPath('errors.level.0', 'Level peringatan tidak dikenal.');

        $this->sendAlert('gempa-x', ['type' => 'gempa'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['level', 'title', 'occurred_at', 'sent_at']);

        $this->assertSame(0, DisasterAlert::query()->count());
    }

    public function test_external_id_outside_the_allowed_format_is_not_routed(): void
    {
        $this->sendAlert('gempa%20881', $this->payload())->assertNotFound();
        $this->sendAlert(str_repeat('a', 101), $this->payload())->assertNotFound();
        $this->sendAlert('bmkg:2026.11-16_881', $this->payload())->assertCreated();
    }

    public function test_end_is_idempotent_and_unknown_ids_return_404(): void
    {
        $this->sendAlert('tsunami-882', $this->payload(['type' => 'tsunami', 'level' => 'awas']))->assertCreated();

        $this->endAlert('tsunami-882')->assertOk()->assertJsonPath('data.status', 'ended');
        $endedAt = DisasterAlert::query()->sole()->ended_at;

        Carbon::setTestNow('2026-11-16 16:10:00');
        $this->endAlert('tsunami-882')->assertOk()->assertJsonPath('data.status', 'ended');
        $this->assertEquals($endedAt, DisasterAlert::query()->sole()->ended_at);
        $this->assertSame(1, Activity::query()->where('event', 'alert_ended')->count());

        $this->endAlert('tidak-ada')
            ->assertNotFound()
            ->assertExactJson(['message' => 'Peringatan tidak ditemukan.']);
    }

    public function test_a_token_without_alerts_write_gets_ability_forbidden(): void
    {
        ['token' => $cimartToken] = $this->createClient('cimart', [IntegrationAbility::SellerApplicationsRead->value]);

        $this->sendAlert('gempa-881', $this->payload(), $cimartToken)
            ->assertForbidden()
            ->assertJson(['code' => 'ability_forbidden']);
        $this->endAlert('gempa-881', $cimartToken)->assertForbidden();

        $this->assertSame(0, DisasterAlert::query()->count());
    }

    public function test_the_same_external_id_from_two_clients_does_not_overwrite(): void
    {
        ['client' => $other, 'token' => $otherToken] = $this->createClient('sigap-cadangan', [IntegrationAbility::AlertsWrite->value]);

        $this->sendAlert('gempa-881', $this->payload(['title' => 'Dari SIGAP']))->assertCreated();
        $this->sendAlert('gempa-881', $this->payload(['title' => 'Dari client lain']), $otherToken)->assertCreated();

        $titleOf = fn (IntegrationClient $client) => DisasterAlert::query()
            ->where('integration_client_id', $client->id)
            ->where('external_id', 'gempa-881')
            ->value('title');

        $this->assertSame('Dari SIGAP', $titleOf($this->sigap));
        $this->assertSame('Dari client lain', $titleOf($other));
    }

    public function test_audit_log_records_events_without_the_token(): void
    {
        $this->sendAlert('gempa-881', $this->payload())->assertCreated();
        $this->sendAlert('gempa-881', $this->payload(['sent_at' => '2026-11-16T14:05:00+07:00']))->assertOk();
        $this->endAlert('gempa-881')->assertOk();

        $created = Activity::query()->where('event', 'alert_created')->sole();
        $this->assertSame('integration', $created->log_name);
        $this->assertSame($this->sigap->id, $created->causer_id);
        $this->assertSame('gempa-881', $created->properties['external_id']);
        $this->assertSame('waspada', $created->properties['level']);
        $this->assertSame(1, Activity::query()->where('event', 'alert_updated')->count());

        $logged = Activity::query()->where('log_name', 'integration')->get()->toJson();
        $this->assertStringNotContainsString(explode('|', $this->token, 2)[1], $logged);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'type' => 'gempa',
            'level' => 'waspada',
            'title' => 'Gempa M5.2 di 23 km barat daya Cibenda',
            'message' => 'Tetap tenang, jauhi bangunan yang retak, dan ikuti arahan petugas.',
            'occurred_at' => '2026-11-16T14:02:00+07:00',
            'sent_at' => '2026-11-16T14:03:00+07:00',
            'expires_at' => '2026-11-16T20:02:00+07:00',
            'magnitude' => 5.2,
            'depth_km' => 10,
            'location' => '23 km barat daya Cibenda',
            'link_url' => null,
            ...$overrides,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function sendAlert(string $externalId, array $payload, ?string $token = null): TestResponse
    {
        Auth::forgetGuards();

        return $this->withToken($token ?? $this->token)->putJson(self::BASE.'/'.$externalId, $payload);
    }

    private function endAlert(string $externalId, ?string $token = null): TestResponse
    {
        Auth::forgetGuards();

        return $this->withToken($token ?? $this->token)->postJson(self::BASE.'/'.$externalId.'/end');
    }

    /**
     * @param  list<string>  $abilities
     * @return array{client: IntegrationClient, token: string}
     */
    private function createClient(string $slug, array $abilities): array
    {
        return app(IntegrationClientService::class)->create($slug, strtoupper($slug), $abilities, $this->village->id);
    }
}
