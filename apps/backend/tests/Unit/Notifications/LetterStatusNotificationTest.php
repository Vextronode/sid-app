<?php

namespace Tests\Unit\Notifications;

use App\Models\Letter;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;
use Tests\TestCase;

/**
 * Notifikasi surat sekarang berjalan beriringan di dua kanal: database
 * (in-app) dan WebPushChannel (push browser).
 */
class LetterStatusNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_via_returns_both_database_and_web_push_channels(): void
    {
        $letter = Letter::factory()->create();
        $notification = new LetterStatusNotification($letter, 'Judul', 'Pesan', 'kasi_approved');

        $channels = $notification->via(User::factory()->make());

        $this->assertSame(['database', WebPushChannel::class], $channels);
    }

    public function test_to_web_push_builds_a_message_with_title_body_and_context(): void
    {
        $letter = Letter::factory()->create([
            'applicant_name' => 'Siti Aminah',
            'letter_number' => '001/SKD/2026',
        ]);
        $notification = new LetterStatusNotification(
            $letter,
            'Permohonan Disetujui',
            'Surat Anda telah disetujui.',
            'kasi_approved'
        );
        $user = User::factory()->make();

        $message = $notification->toWebPush($user, $notification);

        $this->assertInstanceOf(WebPushMessage::class, $message);

        $payload = $message->toArray();
        $this->assertSame('Permohonan Disetujui', $payload['title']);
        $this->assertSame('Surat Anda telah disetujui.', $payload['body']);
        $this->assertSame("letter-{$letter->id}", $payload['tag']);
        $this->assertSame('signature', $payload['data']['icon']);
        $this->assertSame('green', $payload['data']['color']);
        $this->assertSame($letter->id, $payload['data']['context']['letter_id']);
        $this->assertSame('001/SKD/2026', $payload['data']['context']['letter_no']);
        $this->assertSame('Siti Aminah', $payload['data']['context']['applicant']);
    }

    public function test_to_array_and_to_web_push_agree_on_icon_and_color(): void
    {
        $letter = Letter::factory()->create();

        foreach (['rt_approved', 'kasi_rejected', 'waiting_revision_warga', 'unknown_status'] as $status) {
            $notification = new LetterStatusNotification($letter, 'Judul', 'Pesan', $status);
            $user = User::factory()->make();

            $database = $notification->toArray($user);
            $webPush = $notification->toWebPush($user, $notification)->toArray();

            $this->assertSame($database['icon'], $webPush['data']['icon'], "icon mismatch for status {$status}");
            $this->assertSame($database['color'], $webPush['data']['color'], "color mismatch for status {$status}");
        }
    }
}
