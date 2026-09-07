<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_transformed_notifications(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();
        $user->notify(new LetterStatusNotification($letter, 'Judul', 'Pesan', 'pending'));

        $this->actingAs($user)
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.title', 'Judul');
    }

    public function test_read_marks_single_notification(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();
        $user->notify(new LetterStatusNotification($letter, 'Judul', 'Pesan', 'pending'));
        $notification = $user->notifications()->first();

        $this->actingAs($user)
            ->postJson("/api/notifications/{$notification->id}/read")
            ->assertOk()
            ->assertJsonPath('message', 'Notification marked as read');

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_read_all_marks_all_notifications(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();
        $user->notify(new LetterStatusNotification($letter, 'Judul', 'Pesan', 'pending'));

        $this->actingAs($user)
            ->postJson('/api/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('message', 'All notifications marked as read');

        $this->actingAs($user)
            ->getJson('/api/notifications/unread-count')
            ->assertJsonPath('count', 0);
    }

    public function test_unread_count_returns_correct_number(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();
        $user->notify(new LetterStatusNotification($letter, 'Judul', 'Pesan', 'pending'));

        $this->actingAs($user)
            ->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('count', 1);
    }
}
