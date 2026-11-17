<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\PushSubscription;
use App\Models\Rt;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Minishlink\WebPush\MessageSentReport;
use NotificationChannels\WebPush\Events\NotificationFailed;
use NotificationChannels\WebPush\Events\NotificationSent;
use NotificationChannels\WebPush\WebPushMessage;
use Tests\TestCase;

/**
 * Menu Pelanggan Notifikasi: label perangkat saat subscribe, pencatatan
 * hasil kirim push, dan endpoint GET /api/web-push-subscribers.
 */
class WebPushSubscriberTest extends TestCase
{
    use RefreshDatabase;

    private const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

    private Village $village;

    private User $staf;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        $this->staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);
    }

    private function subscribe(User $user, string $endpoint, array $attributes = []): PushSubscription
    {
        $subscription = $user->updatePushSubscription($endpoint, 'public-key', 'auth-token');
        $subscription->forceFill($attributes)->save();

        return $subscription->fresh();
    }

    private function warga(array $attributes = []): User
    {
        return User::factory()->create(['village_id' => $this->village->id, 'role' => 'warga', ...$attributes]);
    }

    // --- Subscribe: device_label -------------------------------------------------

    public function test_subscribe_stores_a_device_label_from_the_user_agent(): void
    {
        $user = $this->warga();

        $this->actingAs($user)
            ->withHeader('User-Agent', self::CHROME_ANDROID)
            ->postJson('/api/push-subscriptions', [
                'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc',
                'keys' => ['p256dh' => 'p', 'auth' => 'a'],
            ])
            ->assertCreated();

        $this->assertDatabaseHas('push_subscriptions', [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc',
            'device_label' => 'Chrome · Android',
        ]);
    }

    // --- Listener hasil kirim ----------------------------------------------------

    public function test_sent_and_failed_events_record_delivery_times_without_touching_updated_at(): void
    {
        $subscription = $this->subscribe($this->warga(), 'https://fcm.googleapis.com/fcm/send/ok');
        $updatedAt = $subscription->updated_at;

        $this->travel(1)->hours();

        $report = $this->createMock(MessageSentReport::class);
        event(new NotificationSent($report, $subscription, new WebPushMessage));
        event(new NotificationFailed($report, $subscription, new WebPushMessage));

        $fresh = $subscription->fresh();
        $this->assertNotNull($fresh->last_success_at);
        $this->assertNotNull($fresh->last_failed_at);
        $this->assertTrue($fresh->updated_at->equalTo($updatedAt));
    }

    public function test_failed_event_for_a_deleted_subscription_does_not_recreate_it(): void
    {
        $subscription = $this->subscribe($this->warga(), 'https://fcm.googleapis.com/fcm/send/gone');
        $subscription->delete();

        event(new NotificationFailed($this->createMock(MessageSentReport::class), $subscription, new WebPushMessage));

        $this->assertDatabaseMissing('push_subscriptions', ['endpoint' => 'https://fcm.googleapis.com/fcm/send/gone']);
    }

    // --- Status perangkat --------------------------------------------------------

    public function test_device_status_follows_the_thirty_day_rule(): void
    {
        $user = $this->warga();

        $untested = $this->subscribe($user, 'https://fcm.googleapis.com/fcm/send/1');
        $active = $this->subscribe($user, 'https://fcm.googleapis.com/fcm/send/2', ['last_success_at' => now()->subDays(29)]);
        $stale = $this->subscribe($user, 'https://fcm.googleapis.com/fcm/send/3', ['last_success_at' => now()->subDays(31)]);
        $failedLater = $this->subscribe($user, 'https://fcm.googleapis.com/fcm/send/4', [
            'last_success_at' => now()->subDays(2),
            'last_failed_at' => now()->subDay(),
        ]);
        $onlyFailed = $this->subscribe($user, 'https://fcm.googleapis.com/fcm/send/5', ['last_failed_at' => now()->subDay()]);

        $this->assertSame('belum_teruji', $untested->status());
        $this->assertSame('aktif', $active->status());
        $this->assertSame('perlu_dicek', $stale->status());
        $this->assertSame('perlu_dicek', $failedLater->status());
        $this->assertSame('perlu_dicek', $onlyFailed->status());

        // Scope SQL harus sama dengan status() di PHP.
        foreach (PushSubscription::STATUSES as $status) {
            $expected = collect([$untested, $active, $stale, $failedLater, $onlyFailed])
                ->filter(fn (PushSubscription $s) => $s->status() === $status)
                ->pluck('id')->sort()->values()->all();

            $this->assertSame($expected, PushSubscription::query()->withStatus($status)->pluck('id')->sort()->values()->all(), $status);
        }
    }

    // --- Endpoint monitoring -----------------------------------------------------

    public function test_only_staf_sid_can_open_the_list(): void
    {
        $this->getJson('/api/web-push-subscribers')->assertUnauthorized();

        foreach (['warga', 'rt', 'kepala_desa', 'kasi_pemerintahan'] as $role) {
            $user = User::factory()->create(['role' => $role, 'village_id' => $this->village->id]);
            $this->actingAs($user)->getJson('/api/web-push-subscribers')->assertForbidden();
        }
    }

    public function test_list_shows_subscribed_accounts_of_the_village_without_push_secrets(): void
    {
        $rt = Rt::factory()->create(['village_id' => $this->village->id]);
        $citizen = Citizen::factory()->create(['village_id' => $this->village->id, 'rt_id' => $rt->id, 'nik' => '3201010101010123']);
        $warga = $this->warga(['citizen_id' => $citizen->id, 'name' => 'Budi Santoso']);
        $this->subscribe($warga, 'https://fcm.googleapis.com/fcm/send/budi', [
            'device_label' => 'Chrome · Android',
            'last_success_at' => now()->subDay(),
        ]);
        $this->subscribe($warga, 'https://web.push.apple.com/xyz');

        $this->warga(); // tidak subscribe
        $otherVillage = User::factory()->create(['village_id' => Village::factory()->create()->id]);
        $this->subscribe($otherVillage, 'https://fcm.googleapis.com/fcm/send/lain');

        $response = $this->actingAs($this->staf)->getJson('/api/web-push-subscribers')->assertOk();

        $response
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Budi Santoso')
            ->assertJsonPath('data.0.role_label', 'Warga')
            ->assertJsonPath('data.0.nik_masked', '************0123')
            ->assertJsonPath('data.0.wilayah.rt', $rt->number)
            ->assertJsonPath('data.0.device_count', 2)
            ->assertJsonPath('data.0.status', 'aktif')
            ->assertJsonPath('meta.active_days', 30)
            ->assertJsonPath('meta.summary.subscribed_accounts', 1)
            ->assertJsonPath('meta.summary.devices', 2)
            ->assertJsonPath('meta.summary.devices_by_status.aktif', 1)
            ->assertJsonPath('meta.summary.devices_by_status.belum_teruji', 1);

        $services = collect($response->json('data.0.devices'))->pluck('push_service')->sort()->values()->all();
        $this->assertSame(['apple', 'fcm'], $services);

        $body = $response->getContent();
        $this->assertStringNotContainsString('fcm/send/budi', $body);
        $this->assertStringNotContainsString('public-key', $body);
        $this->assertStringNotContainsString('auth-token', $body);
        $this->assertStringNotContainsString('3201010101010123', $body);
    }

    public function test_list_can_be_filtered(): void
    {
        $citizen = Citizen::factory()->create(['village_id' => $this->village->id, 'nik' => '3201010101010999']);
        $budi = $this->warga(['name' => 'Budi', 'citizen_id' => $citizen->id]);
        $this->subscribe($budi, 'https://fcm.googleapis.com/fcm/send/budi', ['last_success_at' => now()]);

        $rtUser = User::factory()->create(['village_id' => $this->village->id, 'role' => 'rt', 'name' => 'Pak RT']);
        $this->subscribe($rtUser, 'https://updates.push.services.mozilla.com/wpush/v2/x');

        $names = fn (string $query) => collect(
            $this->actingAs($this->staf)->getJson('/api/web-push-subscribers?'.$query)->assertOk()->json('data'),
        )->pluck('name')->all();

        $this->assertSame(['Pak RT'], $names('role=rt'));
        $this->assertSame(['Budi'], $names('search=bud'));
        $this->assertSame(['Budi'], $names('search=3201010101010999'));
        $this->assertSame(['Pak RT'], $names('push_service=mozilla'));
        $this->assertSame([], $names('push_service=lainnya'));
        $this->assertSame(['Budi'], $names('status=aktif'));
        $this->assertSame(['Pak RT'], $names('status=belum_teruji'));
        $this->assertSame(['Budi'], $names('rt_id='.$citizen->rt_id));

        $this->actingAs($this->staf)->getJson('/api/web-push-subscribers?status=rusak')
            ->assertStatus(422)->assertJsonValidationErrors(['status']);
    }
}
