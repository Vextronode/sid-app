<?php

namespace Tests\Feature\Realtime;

use App\Events\DisasterAlertsChanged;
use App\Models\DisasterAlert;
use App\Models\IntegrationClient;
use App\Models\User;
use App\Models\Village;
use App\Services\DisasterAlertService;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * Tahap 4 realtime: setiap perubahan peringatan bencana yang tersimpan
 * mengirim DisasterAlertsChanged ke channel publik `disaster-alerts`.
 */
class DisasterAlertsChangedBroadcastTest extends TestCase
{
    use RefreshDatabase;

    private IntegrationClient $sigap;

    private User $staf;

    private DisasterAlertService $service;

    protected function setUp(): void
    {
        parent::setUp();

        // Job notifikasi peringatan tidak perlu berjalan di test ini.
        Queue::fake();

        $village = Village::factory()->create();
        $this->sigap = IntegrationClient::factory()->sigap()->create(['village_id' => $village->id]);
        $this->staf = $this->makeStafSidActor($village->id);
        $this->service = app(DisasterAlertService::class);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array{alert: DisasterAlert, created: bool}
     */
    private function upsert(string $externalId, string $sentAt, array $overrides = []): array
    {
        return $this->service->upsertFromSigap($this->sigap, $externalId, [
            'type' => 'gempa',
            'level' => 'waspada',
            'title' => 'Gempa M5.2',
            'occurred_at' => '2026-11-16T14:02:00+07:00',
            'sent_at' => $sentAt,
            ...$overrides,
        ]);
    }

    private function assertSignalFor(string $alertId, int $times = 1): void
    {
        Event::assertDispatchedTimes(DisasterAlertsChanged::class, $times);
        Event::assertDispatched(
            DisasterAlertsChanged::class,
            fn (DisasterAlertsChanged $event) => $event->alertId === $alertId,
        );
    }

    public function test_new_alert_from_sigap_sends_a_signal(): void
    {
        Event::fake([DisasterAlertsChanged::class]);

        ['alert' => $alert] = $this->upsert('gempa-881', '2026-11-16T14:03:00+07:00');

        $this->assertSignalFor($alert->id);
    }

    public function test_newer_update_sends_a_signal_but_stale_and_ended_updates_do_not(): void
    {
        ['alert' => $alert] = $this->upsert('gempa-881', '2026-11-16T14:03:00+07:00');
        Event::fake([DisasterAlertsChanged::class]);

        $this->upsert('gempa-881', '2026-11-16T14:05:00+07:00', ['level' => 'siaga']);
        $this->assertSignalFor($alert->id);

        // Basi (sent_at tidak lebih baru): diabaikan, tanpa sinyal.
        $this->upsert('gempa-881', '2026-11-16T14:04:00+07:00');
        Event::assertDispatchedTimes(DisasterAlertsChanged::class, 1);

        $this->service->endFromSigap($this->sigap, 'gempa-881');
        Event::assertDispatchedTimes(DisasterAlertsChanged::class, 2);

        // Sudah diakhiri: pembaruan diabaikan dan akhir ulang tidak mengirim lagi.
        $this->upsert('gempa-881', '2026-11-16T14:10:00+07:00');
        $this->service->endFromSigap($this->sigap, 'gempa-881');
        Event::assertDispatchedTimes(DisasterAlertsChanged::class, 2);
    }

    public function test_staff_dismiss_and_restore_send_a_signal(): void
    {
        ['alert' => $alert] = $this->upsert('gempa-881', '2026-11-16T14:03:00+07:00');
        Event::fake([DisasterAlertsChanged::class]);

        $this->service->dismiss($alert, $this->staf, 'Alarm palsu.');
        $this->assertSignalFor($alert->id);

        $this->service->restore($alert, $this->staf);
        $this->assertSignalFor($alert->id, 2);
    }

    public function test_pruning_old_alerts_sends_no_signal(): void
    {
        DisasterAlert::factory()->ended()->create([
            'integration_client_id' => $this->sigap->id,
            'ended_at' => now()->subDays((int) config('disaster_alerts.retention_days') + 1),
        ]);
        Event::fake([DisasterAlertsChanged::class]);

        $this->assertSame(1, $this->service->prune());

        Event::assertNotDispatched(DisasterAlertsChanged::class);
    }

    public function test_signal_is_public_and_only_carries_type_and_id(): void
    {
        $event = new DisasterAlertsChanged('alert-1');

        $this->assertSame('disaster-alerts.changed', $event->broadcastAs());
        $this->assertEquals([new Channel('disaster-alerts')], $event->broadcastOn());
        $this->assertNotInstanceOf(PrivateChannel::class, $event->broadcastOn()[0]);
        $this->assertSame(['type' => 'disaster_alert', 'id' => 'alert-1'], $event->broadcastWith());
        $this->assertInstanceOf(ShouldBroadcast::class, $event);
        $this->assertInstanceOf(ShouldDispatchAfterCommit::class, $event);
    }
}
