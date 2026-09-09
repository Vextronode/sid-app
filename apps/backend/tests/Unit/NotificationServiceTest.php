<?php

namespace Tests\Unit;

use App\Models\Letter;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Repositories\NotificationRepository;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationServiceTest extends TestCase
{
    use RefreshDatabase;

    private NotificationService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new NotificationService(new NotificationRepository);
    }

    public function test_get_for_user_transforms_notification_data(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create(['letter_number' => 'ABC/2026']);
        $user->notify(new LetterStatusNotification($letter, 'Judul Uji', 'Pesan Uji', 'kasi_approved'));

        $result = $this->service->getForUser($user);

        $this->assertCount(1, $result);
        $item = $result->first();
        $this->assertSame('Judul Uji', $item['title']);
        $this->assertSame('Pesan Uji', $item['message']);
        $this->assertSame('kasi_approved', $item['status']);
        $this->assertSame($letter->id, $item['letter_id']);
        $this->assertFalse($item['read']);
        $this->assertArrayHasKey('time', $item);
    }

    public function test_mark_as_read_marks_notification(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();
        $user->notify(new LetterStatusNotification($letter, 'Judul', 'Pesan', 'pending'));
        $notification = $user->notifications()->first();

        $this->service->markAsRead($user, $notification->id);

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_mark_all_as_read(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();
        $user->notify(new LetterStatusNotification($letter, 'Judul', 'Pesan', 'pending'));

        $this->service->markAllAsRead($user);

        $this->assertSame(0, $this->service->getUnreadCount($user->fresh()));
    }

    public function test_get_unread_count(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();
        $user->notify(new LetterStatusNotification($letter, 'Judul', 'Pesan', 'pending'));

        $this->assertSame(1, $this->service->getUnreadCount($user));
    }
}
