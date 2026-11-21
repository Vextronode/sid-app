<?php

namespace Tests\Feature\Realtime;

use App\Events\NotificationCreated;
use App\Models\Letter;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * Tahap 3 realtime: setiap notifikasi in-app diikuti sinyal
 * NotificationCreated ke channel private penerimanya.
 */
class NotificationCreatedBroadcastTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_notification_sends_a_signal_to_its_recipient(): void
    {
        Event::fake([NotificationCreated::class]);
        $user = User::factory()->create();
        $other = User::factory()->create();

        $user->notify(new LetterStatusNotification(Letter::factory()->create(), 'Judul', 'Pesan', 'pending'));

        $notificationId = $user->notifications()->value('id');
        Event::assertDispatchedTimes(NotificationCreated::class, 1);
        Event::assertDispatched(
            NotificationCreated::class,
            fn (NotificationCreated $event) => $event->userIds === [$user->id]
                && $event->notificationId === $notificationId,
        );
        Event::assertNotDispatched(
            NotificationCreated::class,
            fn (NotificationCreated $event) => in_array($other->id, $event->userIds, true),
        );
    }

    public function test_notification_without_database_channel_sends_no_signal(): void
    {
        Event::fake([NotificationCreated::class]);
        $user = User::factory()->create();

        $user->notify(new ResetPasswordNotification('token-reset'));

        Event::assertNotDispatched(NotificationCreated::class);
    }

    public function test_signal_only_carries_type_and_id_on_the_recipients_private_channel(): void
    {
        $event = new NotificationCreated(['user-1', 'user-2'], 'notif-9');

        $this->assertSame('notification.created', $event->broadcastAs());
        $this->assertEquals(
            [new PrivateChannel('App.Models.User.user-1'), new PrivateChannel('App.Models.User.user-2')],
            $event->broadcastOn(),
        );
        $this->assertSame(['type' => 'notification', 'id' => 'notif-9'], $event->broadcastWith());
    }

    public function test_signal_is_queued_after_commit_instead_of_sent_inside_the_request(): void
    {
        $event = new NotificationCreated(['user-1']);

        $this->assertInstanceOf(ShouldBroadcast::class, $event);
        $this->assertNotInstanceOf(ShouldBroadcastNow::class, $event);
        $this->assertInstanceOf(ShouldDispatchAfterCommit::class, $event);
    }
}
