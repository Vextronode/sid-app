<?php

namespace Tests\Feature\Integration;

use App\Enums\IntegrationAbility;
use App\Jobs\SendDisasterAlertNotifications;
use App\Models\DisasterAlert;
use App\Models\IntegrationClient;
use App\Models\User;
use App\Models\Village;
use App\Notifications\DisasterAlertNotification;
use App\Services\IntegrationClientService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Notifikasi peringatan bencana ke semua akun aktif di desa (langkah 3):
 * hanya saat peringatan baru tampil, levelnya naik, atau gempa susulan
 * (external_id sama) minimal 1M di atas patokan, tanpa kiriman dobel.
 */
class DisasterAlertNotificationTest extends TestCase
{
    use RefreshDatabase;

    private Village $village;

    private IntegrationClient $sigap;

    private string $token;

    /** @var list<User> */
    private array $residents;

    private User $inactive;

    private User $otherVillageUser;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-11-16 14:03:00');

        $this->village = Village::factory()->create();
        ['client' => $this->sigap, 'token' => $this->token] = app(IntegrationClientService::class)->create(
            'sigap',
            'SIGAP',
            [IntegrationAbility::AlertsWrite->value],
            $this->village->id,
        );

        $this->residents = [
            User::factory()->create(['village_id' => $this->village->id]),
            User::factory()->create(['village_id' => $this->village->id, 'role' => 'staf_sid']),
            User::factory()->create(['village_id' => $this->village->id, 'role' => 'rt']),
        ];
        $this->inactive = User::factory()->inactive()->create(['village_id' => $this->village->id]);
        $this->otherVillageUser = User::factory()->create(['village_id' => Village::factory()->create()->id]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_a_new_alert_notifies_every_active_account_in_the_village_once(): void
    {
        Notification::fake();

        $this->sendAlert('tsunami-882', ['type' => 'tsunami', 'level' => 'awas', 'title' => 'Peringatan dini tsunami'])->assertCreated();

        foreach ($this->residents as $user) {
            Notification::assertSentToTimes($user, DisasterAlertNotification::class, 1);
        }
        Notification::assertNotSentTo($this->inactive, DisasterAlertNotification::class);
        Notification::assertNotSentTo($this->otherVillageUser, DisasterAlertNotification::class);

        Notification::assertSentTo($this->residents[0], DisasterAlertNotification::class, function (DisasterAlertNotification $notification) {
            $data = $notification->toArray($this->residents[0]);

            return $data['title'] === 'AWAS: Peringatan dini tsunami'
                && $data['category'] === 'informasi'
                && $data['color'] === 'red'
                && $data['context']['status'] === 'disaster_alert'
                && $data['context']['level'] === 'awas'
                && $data['context']['alert_id'] === DisasterAlert::query()->value('id');
        });

        $this->assertSame(3, DisasterAlert::query()->value('notified_level_rank'));
    }

    public function test_level_rise_notifies_again_but_text_revisions_and_level_drops_do_not(): void
    {
        Notification::fake();

        $this->sendAlert('gempa-881', ['level' => 'waspada', 'sent_at' => '2026-11-16T14:03:00+07:00'])->assertCreated();
        $this->sendAlert('gempa-881', ['level' => 'waspada', 'title' => 'Gempa M6.9 (revisi)', 'sent_at' => '2026-11-16T14:05:00+07:00'])->assertOk();
        $this->sendAlert('gempa-881', ['level' => 'siaga', 'sent_at' => '2026-11-16T14:06:00+07:00'])->assertOk();

        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 2);

        // Turun lalu naik lagi ke level yang sudah pernah dikirim: tidak dikirim.
        $this->sendAlert('gempa-881', ['level' => 'waspada', 'sent_at' => '2026-11-16T14:07:00+07:00'])->assertOk();
        $this->sendAlert('gempa-881', ['level' => 'siaga', 'sent_at' => '2026-11-16T14:08:00+07:00'])->assertOk();

        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 2);

        $this->sendAlert('gempa-881', ['level' => 'awas', 'sent_at' => '2026-11-16T14:09:00+07:00'])->assertOk();

        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 3);
        $this->assertSame(3, DisasterAlert::query()->value('notified_level_rank'));
    }

    public function test_aftershocks_notify_again_only_when_at_least_one_magnitude_above_the_last_notified(): void
    {
        Notification::fake();

        $this->sendAlert('gempa-881', ['magnitude' => 5.0, 'sent_at' => '2026-11-16T14:03:00+07:00'])->assertCreated();
        $this->assertSame(5.0, $this->alertModel()->notified_magnitude);

        // Susulan +0.6 dan +0.9 dari patokan: hanya pembaruan.
        $this->sendAlert('gempa-881', ['magnitude' => 5.6, 'title' => 'Susulan M5.6', 'sent_at' => '2026-11-16T14:10:00+07:00'])->assertOk();
        $this->sendAlert('gempa-881', ['magnitude' => 5.9, 'title' => 'Susulan M5.9', 'sent_at' => '2026-11-16T14:20:00+07:00'])->assertOk();

        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 1);
        $this->assertSame('Susulan M5.9', DisasterAlert::query()->value('title'));
        $this->assertSame(5.0, $this->alertModel()->notified_magnitude);

        // Tepat +1.0 dari patokan (bukan dari susulan sebelumnya): dikirim.
        $this->sendAlert('gempa-881', ['magnitude' => 6.0, 'title' => 'Susulan M6.0', 'sent_at' => '2026-11-16T14:30:00+07:00'])->assertOk();

        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 2);
        $this->assertSame(6.0, $this->alertModel()->notified_magnitude);

        // Patokan sudah bergeser ke 6.0.
        $this->sendAlert('gempa-881', ['magnitude' => 6.9, 'sent_at' => '2026-11-16T14:40:00+07:00'])->assertOk();
        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 2);

        $this->sendAlert('gempa-881', ['magnitude' => 7.0, 'sent_at' => '2026-11-16T14:50:00+07:00'])->assertOk();
        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 3);
    }

    public function test_alert_without_magnitude_only_follows_the_level_rule(): void
    {
        Notification::fake();

        $this->sendAlert('tsunami-882', ['type' => 'tsunami', 'level' => 'siaga', 'sent_at' => '2026-11-16T14:03:00+07:00'])->assertCreated();
        $this->sendAlert('tsunami-882', ['type' => 'tsunami', 'level' => 'siaga', 'title' => 'Revisi', 'sent_at' => '2026-11-16T14:04:00+07:00'])->assertOk();
        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 1);

        $this->sendAlert('tsunami-882', ['type' => 'tsunami', 'level' => 'awas', 'sent_at' => '2026-11-16T14:05:00+07:00'])->assertOk();
        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 2);
        $this->assertNull($this->alertModel()->notified_magnitude);
    }

    public function test_first_magnitude_after_notification_only_sets_the_baseline(): void
    {
        Notification::fake();

        $this->sendAlert('gempa-881', ['sent_at' => '2026-11-16T14:03:00+07:00'])->assertCreated();
        $this->assertNull($this->alertModel()->notified_magnitude);

        $this->sendAlert('gempa-881', ['magnitude' => 6.0, 'sent_at' => '2026-11-16T14:04:00+07:00'])->assertOk();
        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 1);
        $this->assertSame(6.0, $this->alertModel()->notified_magnitude);

        $this->sendAlert('gempa-881', ['magnitude' => 6.5, 'sent_at' => '2026-11-16T14:05:00+07:00'])->assertOk();
        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 1);

        $this->sendAlert('gempa-881', ['magnitude' => 7.0, 'sent_at' => '2026-11-16T14:06:00+07:00'])->assertOk();
        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 2);
        $this->assertSame(7.0, $this->alertModel()->notified_magnitude);
    }

    public function test_missing_magnitude_in_an_update_keeps_the_baseline(): void
    {
        Notification::fake();

        $this->sendAlert('gempa-881', ['magnitude' => 6.0, 'sent_at' => '2026-11-16T14:03:00+07:00'])->assertCreated();
        $this->sendAlert('gempa-881', ['sent_at' => '2026-11-16T14:04:00+07:00'])->assertOk();

        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 1);
        $this->assertSame(6.0, $this->alertModel()->notified_magnitude);

        $this->sendAlert('gempa-881', ['magnitude' => 7.2, 'sent_at' => '2026-11-16T14:05:00+07:00'])->assertOk();
        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 2);
    }

    public function test_level_rise_without_magnitude_keeps_the_magnitude_baseline(): void
    {
        Notification::fake();

        $this->sendAlert('gempa-881', ['magnitude' => 6.0, 'sent_at' => '2026-11-16T14:03:00+07:00'])->assertCreated();
        $this->sendAlert('gempa-881', ['level' => 'awas', 'sent_at' => '2026-11-16T14:04:00+07:00'])->assertOk();

        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 2);
        $this->assertSame([3, 6.0], [$this->alertModel()->notified_level_rank, $this->alertModel()->notified_magnitude]);
    }

    public function test_magnitude_threshold_follows_config(): void
    {
        Notification::fake();
        config(['disaster_alerts.magnitude_renotify_delta' => 0.5]);

        $this->sendAlert('gempa-881', ['magnitude' => 5.0, 'sent_at' => '2026-11-16T14:03:00+07:00'])->assertCreated();
        $this->sendAlert('gempa-881', ['magnitude' => 5.4, 'sent_at' => '2026-11-16T14:04:00+07:00'])->assertOk();
        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 1);

        $this->sendAlert('gempa-881', ['magnitude' => 5.5, 'sent_at' => '2026-11-16T14:05:00+07:00'])->assertOk();
        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 2);
    }

    public function test_aftershock_job_running_twice_does_not_send_twice(): void
    {
        Queue::fake();
        Notification::fake();

        $this->sendAlert('gempa-881', ['magnitude' => 5.0, 'sent_at' => '2026-11-16T14:03:00+07:00'])->assertCreated();
        $id = DisasterAlert::query()->value('id');
        (new SendDisasterAlertNotifications($id))->handle();

        $this->sendAlert('gempa-881', ['magnitude' => 6.3, 'sent_at' => '2026-11-16T14:10:00+07:00'])->assertOk();
        Queue::assertPushed(SendDisasterAlertNotifications::class, 2);

        (new SendDisasterAlertNotifications($id))->handle();
        (new SendDisasterAlertNotifications($id))->handle();

        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 2);
    }

    private function alertModel(): DisasterAlert
    {
        return DisasterAlert::query()->sole();
    }

    public function test_ending_or_ignored_updates_do_not_notify(): void
    {
        Notification::fake();

        $this->sendAlert('gempa-881', ['level' => 'waspada'])->assertCreated();
        $this->endAlert('gempa-881')->assertOk();
        $this->sendAlert('gempa-881', ['level' => 'awas', 'sent_at' => '2026-11-16T15:00:00+07:00'])->assertOk();

        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 1);
    }

    public function test_alert_dismissed_or_ended_before_the_job_runs_is_not_sent(): void
    {
        Queue::fake();
        Notification::fake();

        $this->sendAlert('gempa-dismissed', ['level' => 'awas'])->assertCreated();
        $this->sendAlert('gempa-ended', ['level' => 'awas'])->assertCreated();
        Queue::assertPushed(SendDisasterAlertNotifications::class, 2);

        DisasterAlert::query()->where('external_id', 'gempa-dismissed')->update(['dismissed_at' => now()]);
        DisasterAlert::query()->where('external_id', 'gempa-ended')->update(['ended_at' => now()]);

        foreach (DisasterAlert::query()->pluck('id') as $id) {
            (new SendDisasterAlertNotifications($id))->handle();
        }

        Notification::assertNothingSent();
        $this->assertSame([null, null], DisasterAlert::query()->pluck('notified_level_rank')->all());
    }

    public function test_running_the_job_twice_does_not_send_twice(): void
    {
        Queue::fake();
        Notification::fake();

        $this->sendAlert('gempa-881', ['level' => 'awas'])->assertCreated();
        $id = DisasterAlert::query()->value('id');

        (new SendDisasterAlertNotifications($id))->handle();
        (new SendDisasterAlertNotifications($id))->handle();

        Notification::assertSentToTimes($this->residents[0], DisasterAlertNotification::class, 1);
    }

    public function test_in_app_notifications_are_written_for_each_active_account(): void
    {
        $this->sendAlert('gempa-881', ['level' => 'siaga', 'title' => 'Gempa M5.2'])->assertCreated();

        $this->assertSame(3, $this->countNotifications());

        $row = $this->residents[0]->notifications()->sole();
        $this->assertSame('SIAGA: Gempa M5.2', $row->data['title']);
        $this->assertSame('disaster_alert', $row->data['context']['status']);
    }

    private function countNotifications(): int
    {
        return DB::table('notifications')
            ->where('type', DisasterAlertNotification::class)
            ->count();
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function sendAlert(string $externalId, array $overrides): TestResponse
    {
        Auth::forgetGuards();

        return $this->withToken($this->token)->putJson('/api/integrations/v1/alerts/'.$externalId, [
            'type' => 'gempa',
            'level' => 'waspada',
            'title' => 'Gempa M7.1',
            'occurred_at' => '2026-11-16T14:02:00+07:00',
            'sent_at' => '2026-11-16T14:03:00+07:00',
            ...$overrides,
        ]);
    }

    private function endAlert(string $externalId): TestResponse
    {
        Auth::forgetGuards();

        return $this->withToken($this->token)->postJson('/api/integrations/v1/alerts/'.$externalId.'/end');
    }
}
