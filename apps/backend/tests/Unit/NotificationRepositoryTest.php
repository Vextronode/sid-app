<?php

namespace Tests\Unit;

use App\Models\Letter;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Repositories\NotificationRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private NotificationRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new NotificationRepository;
    }

    public function test_all_for_user_latest_first_returns_notifications(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();
        $user->notify(new LetterStatusNotification($letter, 'Judul', 'Pesan', 'pending'));

        $result = $this->repository->allForUserLatestFirst($user);

        $this->assertCount(1, $result);
    }

    public function test_find_or_fail_for_user_returns_notification_by_id(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();
        $user->notify(new LetterStatusNotification($letter, 'Judul', 'Pesan', 'pending'));
        $notification = $user->notifications()->first();

        $found = $this->repository->findOrFailForUser($user, $notification->id);

        $this->assertSame($notification->id, $found->id);
    }

    public function test_mark_as_read_sets_read_at(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();
        $user->notify(new LetterStatusNotification($letter, 'Judul', 'Pesan', 'pending'));
        $notification = $user->notifications()->first();

        $this->repository->markAsRead($notification);

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_mark_all_as_read_for_user(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();
        $user->notify(new LetterStatusNotification($letter, 'Judul 1', 'Pesan 1', 'pending'));
        $user->notify(new LetterStatusNotification($letter, 'Judul 2', 'Pesan 2', 'pending'));

        $this->repository->markAllAsReadForUser($user);

        $this->assertSame(0, $this->repository->countUnreadForUser($user->fresh()));
    }

    public function test_count_unread_for_user(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();
        $user->notify(new LetterStatusNotification($letter, 'Judul', 'Pesan', 'pending'));

        $count = $this->repository->countUnreadForUser($user);

        $this->assertSame(1, $count);
    }
}
