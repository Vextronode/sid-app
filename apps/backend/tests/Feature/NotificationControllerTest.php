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
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Judul');
    }

    public function test_index_is_paginated_twenty_per_page(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();
        for ($i = 1; $i <= 25; $i++) {
            $user->notify(new LetterStatusNotification($letter, "Judul {$i}", 'Pesan', 'pending'));
        }

        $this->actingAs($user)
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.total', 25);

        $this->actingAs($user)
            ->getJson('/api/notifications?page=2')
            ->assertOk()
            ->assertJsonCount(5, 'data');
    }

    public function test_prune_removes_only_notifications_read_longer_than_the_retention(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();
        foreach (['lama dibaca', 'baru dibaca', 'lama belum dibaca'] as $title) {
            $user->notify(new LetterStatusNotification($letter, $title, 'Pesan', 'pending'));
        }
        $byTitle = fn (string $title) => $user->notifications()->get()->first(fn ($n) => $n->data['title'] === $title);
        $byTitle('lama dibaca')->forceFill(['read_at' => now()->subDays(91)])->save();
        $byTitle('baru dibaca')->forceFill(['read_at' => now()->subDays(10)])->save();
        $byTitle('lama belum dibaca')->forceFill(['created_at' => now()->subDays(400)])->save();

        $this->artisan('notifications:prune')->assertSuccessful();

        $this->assertEqualsCanonicalizing(
            ['baru dibaca', 'lama belum dibaca'],
            $user->notifications()->get()->map(fn ($n) => $n->data['title'])->all(),
        );
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
            ->assertJsonPath('message', 'Notifikasi berhasil ditandai dibaca.');

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
            ->assertJsonPath('message', 'Semua notifikasi berhasil ditandai dibaca.');

        $this->actingAs($user)
            ->getJson('/api/notifications/unread-count')
            ->assertJsonPath('data.count', 0);
    }

    public function test_unread_count_returns_correct_number(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create();
        $user->notify(new LetterStatusNotification($letter, 'Judul', 'Pesan', 'pending'));

        $this->actingAs($user)
            ->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.count', 1);
    }
}
