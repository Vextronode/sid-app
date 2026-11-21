<?php

namespace Tests\Feature\Realtime;

use App\Enums\LetterStatus;
use App\Events\LetterChanged;
use App\Models\Letter;
use App\Repositories\LetterRepository;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * Tahap 5 realtime: LetterRealtimeObserver mengirim LetterChanged ke
 * `letters.staff` dan ke channel akun pemohon setiap kali surat berubah.
 */
class LetterChangedBroadcastTest extends TestCase
{
    use RefreshDatabase;

    private function assertSignalFor(Letter $letter, int $times = 1): void
    {
        Event::assertDispatchedTimes(LetterChanged::class, $times);
        Event::assertDispatched(
            LetterChanged::class,
            fn (LetterChanged $event) => $event->letterId === $letter->id
                && $event->requesterId === $letter->submitted_by,
        );
    }

    public function test_submitting_a_letter_sends_a_signal_to_staff_and_the_requester(): void
    {
        Event::fake([LetterChanged::class]);

        $letter = Letter::factory()->create();

        $this->assertSignalFor($letter);
    }

    public function test_status_change_sends_a_signal(): void
    {
        $letter = Letter::factory()->create();
        Event::fake([LetterChanged::class]);

        $letter->update(['status' => LetterStatus::InProgress]);

        $this->assertSignalFor($letter);
    }

    public function test_moving_to_the_next_approval_step_without_status_change_sends_a_signal(): void
    {
        $letter = Letter::factory()->create(['status' => LetterStatus::InProgress]);
        Event::fake([LetterChanged::class]);

        $letter->update(['current_step_order' => 2]);

        $this->assertSignalFor($letter);
    }

    public function test_bookkeeping_changes_send_no_signal(): void
    {
        $letter = Letter::factory()->create();
        Event::fake([LetterChanged::class]);

        // Pengingat masa berlaku (terjadwal tiap jam) dan backfill snapshot.
        app(LetterRepository::class)->markExpiryNotified($letter, 3);
        $letter->update(['snapshot' => ['letter_type' => ['name' => 'Surat Keterangan']]]);
        // Simpan tanpa perubahan apa pun.
        $letter->save();

        Event::assertNotDispatched(LetterChanged::class);
    }

    public function test_deleting_a_letter_sends_a_signal(): void
    {
        $letter = Letter::factory()->create();
        Event::fake([LetterChanged::class]);

        $letter->delete();

        $this->assertSignalFor($letter);
    }

    public function test_signal_only_carries_type_and_id_on_staff_and_requester_channels(): void
    {
        $event = new LetterChanged('letter-1', 'user-1');

        $this->assertSame('letter.changed', $event->broadcastAs());
        $this->assertEquals(
            [new PrivateChannel('letters.staff'), new PrivateChannel('App.Models.User.user-1')],
            $event->broadcastOn(),
        );
        $this->assertSame(['type' => 'letter', 'id' => 'letter-1'], $event->broadcastWith());
        $this->assertEquals([new PrivateChannel('letters.staff')], (new LetterChanged('letter-1'))->broadcastOn());
        $this->assertInstanceOf(ShouldBroadcast::class, $event);
        $this->assertInstanceOf(ShouldDispatchAfterCommit::class, $event);
    }
}
