<?php

namespace Tests\Feature\Realtime;

use App\Enums\LetterStatus;
use App\Events\DisasterAlertsChanged;
use App\Events\LetterChanged;
use App\Events\NotificationCreated;
use App\Models\Letter;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use Illuminate\Broadcasting\Broadcasters\Broadcaster;
use Illuminate\Broadcasting\BroadcastException;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Exceptions;
use Tests\TestCase;

/**
 * Realtime bersifat opsional: Reverb yang tidak terjangkau tidak boleh
 * menggagalkan aksi pengguna. Dengan QUEUE_CONNECTION=sync (phpunit.xml,
 * juga opsi lokal di SETUP) broadcast berjalan di dalam request;
 * ShouldRescue membuat kegagalannya hanya dilaporkan ke log.
 */
class RealtimeSignalFailureTest extends TestCase
{
    use RefreshDatabase;

    public const FAILURE = 'Reverb tidak terjangkau.';

    protected function setUp(): void
    {
        parent::setUp();

        // Broadcaster yang selalu gagal, seperti Reverb yang mati.
        Broadcast::extend('failing', fn () => new class extends Broadcaster
        {
            public function auth($request)
            {
                return null;
            }

            public function validAuthenticationResponse($request, $result)
            {
                return null;
            }

            public function broadcast(array $channels, $event, array $payload = [])
            {
                throw new BroadcastException(RealtimeSignalFailureTest::FAILURE);
            }
        });

        config([
            'queue.default' => 'sync',
            'broadcasting.default' => 'failing',
            'broadcasting.connections.failing' => ['driver' => 'failing'],
        ]);
        Broadcast::forgetDrivers();
        Exceptions::fake();
    }

    private function assertFailureReported(): void
    {
        Exceptions::assertReported(
            fn (BroadcastException $exception) => $exception->getMessage() === self::FAILURE,
        );
    }

    public function test_every_realtime_signal_is_rescued(): void
    {
        foreach ([NotificationCreated::class, LetterChanged::class, DisasterAlertsChanged::class] as $event) {
            $this->assertContains(ShouldRescue::class, class_implements($event), $event);
        }
    }

    public function test_letter_change_still_succeeds_when_reverb_is_down(): void
    {
        $letter = Letter::factory()->create();

        $letter->update(['status' => LetterStatus::InProgress]);

        $this->assertSame(LetterStatus::InProgress, $letter->fresh()->status);
        $this->assertFailureReported();
    }

    public function test_in_app_notification_is_still_saved_when_reverb_is_down(): void
    {
        $user = User::factory()->create();

        $user->notify(new LetterStatusNotification(Letter::factory()->create(), 'Judul', 'Pesan', 'pending'));

        $this->assertSame(1, $user->notifications()->count());
        $this->assertFailureReported();
    }

    public function test_disaster_alert_signal_failure_is_only_reported(): void
    {
        DisasterAlertsChanged::dispatch('alert-1');

        $this->assertFailureReported();
    }
}
