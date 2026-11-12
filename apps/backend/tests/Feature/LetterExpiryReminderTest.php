<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterExpiryReminderSetting;
use App\Models\LetterType;
use App\Models\User;
use App\Models\Village;
use App\Notifications\LetterStatusNotification;
use Database\Seeders\LetterExpiryReminderSettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Pengingat masa berlaku surat (letters:send-expiry-reminders).
 *
 * Skenario dasar: surat 90 hari disetujui 13 September 2026 14:37 WIB,
 * berlaku sampai 12 Desember 2026, sehingga hari H = 13 Desember 2026.
 * Jatuh tempo (09:00 WIB): H-30 13 Nov, H-14 29 Nov, H-7 6 Des,
 * H-3 10 Des, H-1 12 Des, hari H 13 Des.
 */
class LetterExpiryReminderTest extends TestCase
{
    use BuildsLetterScenario;
    use RefreshDatabase;

    private Village $village;

    private User $applicant;

    private Letter $letter;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->at('2026-09-13 14:37');

        $this->village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($this->village);
        ['citizen' => $citizen, 'user' => $this->applicant] = $this->makeCitizenAccount($this->village, $rt);
        $this->seed(LetterExpiryReminderSettingSeeder::class);

        $this->letter = $this->makeLetter($this->applicant, $citizen->id);
    }

    private function at(string $time): void
    {
        $this->travelTo(Carbon::parse($time, 'Asia/Jakarta'));
    }

    private function makeLetter(User $submitter, ?string $citizenId, ?string $processedAt = '2026-09-13 14:37', array $attributes = []): Letter
    {
        return Letter::factory()
            ->approvedExpiringOn(
                Carbon::parse('2026-12-12', 'Asia/Jakarta'),
                Carbon::parse($processedAt, 'Asia/Jakarta'),
            )
            ->create([
                'village_id' => $this->village->id,
                'letter_type_id' => LetterType::factory()->create(['name' => 'Surat Keterangan Domisili'])->id,
                'submitted_by' => $submitter->id,
                'citizen_id' => $citizenId,
                ...$attributes,
            ]);
    }

    private function runReminders(?int $expectedSent = null): void
    {
        $command = $this->artisan('letters:send-expiry-reminders');

        if ($expectedSent !== null) {
            $command->expectsOutput("Pengingat masa berlaku surat terkirim: {$expectedSent}.");
        }

        $command->assertSuccessful();
    }

    private function setPoint(int $daysBefore, bool $active): void
    {
        $setting = LetterExpiryReminderSetting::query()
            ->where('village_id', $this->village->id)
            ->where('days_before', $daysBefore)
            ->firstOrFail();

        $setting->update([
            'is_active' => $active,
            'activated_at' => $active && ! $setting->is_active ? now() : $setting->activated_at,
        ]);
    }

    /**
     * @return list<array<string, mixed>> payload toArray notifikasi pemohon, urut kirim
     */
    private function sentTo(User $user): array
    {
        return Notification::sent($user, LetterStatusNotification::class)
            ->map(fn (LetterStatusNotification $notification) => $notification->toArray($user))
            ->values()
            ->all();
    }

    public function test_h30_is_sent_exactly_once(): void
    {
        $this->at('2026-11-13 09:00');

        $this->runReminders(expectedSent: 1);
        $this->runReminders(expectedSent: 0);
        $this->travel(1)->hours();
        $this->runReminders(expectedSent: 0);

        $sent = $this->sentTo($this->applicant);
        $this->assertCount(1, $sent);
        $this->assertSame('Surat Akan Kedaluwarsa', $sent[0]['title']);
        $this->assertSame(
            'Surat Keterangan Domisili Anda akan kedaluwarsa dalam 30 hari (berlaku sampai 12 Desember 2026). '
                .'Unduh sebelum masa berlakunya habis, atau ajukan surat baru bila masih diperlukan.',
            $sent[0]['message'],
        );
        $this->assertSame('letter_expiring_soon', $sent[0]['context']['status']);
        $this->assertSame(30, $sent[0]['context']['reminder_days']);
        $this->assertSame(30, $sent[0]['context']['days_left']);
        $this->assertSame('clock', $sent[0]['icon']);
        $this->assertSame('amber', $sent[0]['color']);
        $this->assertSame(30, $this->letter->fresh()->expiry_notified_days);
    }

    public function test_nothing_is_sent_before_send_time(): void
    {
        $this->at('2026-11-13 08:59');
        $this->runReminders(expectedSent: 0);
        Notification::assertNothingSent();

        $this->at('2026-11-13 09:00');
        $this->runReminders(expectedSent: 1);
    }

    public function test_catch_up_after_downtime_sends_only_the_closest_point(): void
    {
        $this->at('2026-11-29 09:00');
        $this->runReminders(expectedSent: 1);

        // Scheduler mati dari setelah H-14 sampai H-3.
        $this->at('2026-12-10 10:00');
        $this->runReminders(expectedSent: 1);

        $sent = $this->sentTo($this->applicant);
        $this->assertSame([14, 3], array_map(fn ($n) => $n['context']['reminder_days'], $sent));
        $this->assertSame(3, $this->letter->fresh()->expiry_notified_days);
    }

    public function test_late_reminder_mentions_actual_days_left(): void
    {
        // H-7 jatuh tempo 6 Desember, terkirim terlambat 8 Desember.
        $this->at('2026-12-08 09:00');
        $this->runReminders(expectedSent: 1);

        $sent = $this->sentTo($this->applicant);
        $this->assertSame(7, $sent[0]['context']['reminder_days']);
        $this->assertSame(5, $sent[0]['context']['days_left']);
        $this->assertStringContainsString('dalam 5 hari', $sent[0]['message']);
    }

    public function test_last_day_message(): void
    {
        $this->at('2026-12-12 09:00');
        $this->runReminders(expectedSent: 1);

        $sent = $this->sentTo($this->applicant);
        $this->assertSame(1, $sent[0]['context']['reminder_days']);
        $this->assertSame(1, $sent[0]['context']['days_left']);
        $this->assertSame(
            'Hari ini hari terakhir masa berlaku Surat Keterangan Domisili Anda (sampai 12 Desember 2026).',
            $sent[0]['message'],
        );
    }

    public function test_points_due_before_approval_are_skipped_for_short_validity(): void
    {
        $this->letter->delete();
        $letter = $this->makeLetter($this->applicant, null, processedAt: '2026-12-05 14:37');

        $this->at('2026-12-05 15:00');
        $this->runReminders(expectedSent: 0);

        $this->at('2026-12-06 09:00');
        $this->runReminders(expectedSent: 1);

        $sent = $this->sentTo($this->applicant);
        $this->assertCount(1, $sent);
        $this->assertSame(7, $sent[0]['context']['reminder_days']);
        $this->assertSame(7, $letter->fresh()->expiry_notified_days);
    }

    public function test_disabled_point_is_not_sent(): void
    {
        $this->setPoint(30, active: false);

        $this->at('2026-11-13 10:00');
        $this->runReminders(expectedSent: 0);

        Notification::assertNothingSent();
        $this->assertNull($this->letter->fresh()->expiry_notified_days);
    }

    public function test_reenabled_point_does_not_send_dues_from_before_activation(): void
    {
        $this->setPoint(30, active: false);
        $this->setPoint(14, active: false);

        $this->at('2026-11-30 10:00');
        $this->setPoint(30, active: true);
        $this->setPoint(14, active: true);
        $this->runReminders(expectedSent: 0);
        Notification::assertNothingSent();

        $this->at('2026-12-06 09:00');
        $this->runReminders(expectedSent: 1);
        $this->assertSame(7, $this->sentTo($this->applicant)[0]['context']['reminder_days']);
    }

    public function test_expired_notice_is_sent_even_with_all_points_disabled(): void
    {
        foreach (LetterExpiryReminderSetting::DAYS_BEFORE_OPTIONS as $days) {
            $this->setPoint($days, active: false);
        }

        // Sudah terkunci, tapi pemberitahuan hari H baru pukul 09:00.
        $this->at('2026-12-13 08:00');
        $this->runReminders(expectedSent: 0);

        $this->at('2026-12-13 09:00');
        $this->runReminders(expectedSent: 1);

        $sent = $this->sentTo($this->applicant);
        $this->assertCount(1, $sent);
        $this->assertSame('Surat Sudah Kedaluwarsa', $sent[0]['title']);
        $this->assertSame(
            'Masa berlaku Surat Keterangan Domisili Anda habis pada 12 Desember 2026. Surat tidak dapat diunduh lagi.',
            $sent[0]['message'],
        );
        $this->assertSame('letter_expired', $sent[0]['context']['status']);
        $this->assertSame(0, $sent[0]['context']['reminder_days']);
        $this->assertSame(0, $sent[0]['context']['days_left']);
        $this->assertSame('red', $sent[0]['color']);
        $this->assertSame(0, $this->letter->fresh()->expiry_notified_days);

        $this->actingAs($this->applicant)
            ->getJson("/api/letters/{$this->letter->id}")
            ->assertOk()
            ->assertJsonPath('data.is_expired', true);
    }

    public function test_pending_last_day_reminder_is_not_sent_after_letter_locked(): void
    {
        // H-1 belum terkirim (scheduler mati) dan surat sudah terkunci:
        // jangan kirim "hari terakhir", tunggu pemberitahuan hari H.
        $this->at('2026-12-13 01:00');
        $this->runReminders(expectedSent: 0);

        Notification::assertNothingSent();
    }

    public function test_expired_notice_within_grace_period_is_still_sent(): void
    {
        $this->at('2026-12-16 08:00');
        $this->runReminders(expectedSent: 1);

        $this->assertSame('letter_expired', $this->sentTo($this->applicant)[0]['context']['status']);
    }

    public function test_expired_notice_past_grace_period_is_marked_without_sending(): void
    {
        $this->at('2026-12-16 09:01');
        $this->runReminders(expectedSent: 0);

        Notification::assertNothingSent();
        $this->assertSame(0, $this->letter->fresh()->expiry_notified_days);
    }

    public function test_letters_without_expiry_unfinished_or_with_inactive_applicant_are_skipped(): void
    {
        $this->letter->delete();
        $this->makeLetter($this->applicant, null, attributes: ['expires_at' => null]);
        $this->makeLetter($this->applicant, null, attributes: ['status' => 'rejected']);
        $this->makeLetter($this->applicant, null, attributes: ['status' => 'in_progress']);
        ['user' => $inactive] = $this->makeCitizenAccount($this->village, null);
        $inactive->update(['is_active' => false]);
        $this->makeLetter($inactive, $inactive->citizen_id);

        $this->at('2026-12-13 10:00');
        $this->runReminders(expectedSent: 0);

        Notification::assertNothingSent();
        $this->assertSame(0, Letter::query()->whereNotNull('expiry_notified_days')->count());
    }

    public function test_recipient_is_submitter_and_official_applicant_is_flagged(): void
    {
        ['user' => $kades, 'citizen' => $kadesCitizen] = $this->makeOfficialUser('kepala_desa', $this->village);
        $this->makeLetter($kades, $kadesCitizen->id);

        $this->at('2026-11-13 09:00');
        $this->runReminders(expectedSent: 2);

        $this->assertTrue($this->sentTo($this->applicant)[0]['context']['is_applicant']);
        $this->assertTrue($this->sentTo($kades)[0]['context']['is_applicant']);
        Notification::assertSentToTimes($kades, LetterStatusNotification::class, 1);
    }

    public function test_web_push_carries_reminder_context_and_letter_tag(): void
    {
        $this->at('2026-11-13 09:00');
        $this->runReminders(expectedSent: 1);

        $notification = Notification::sent($this->applicant, LetterStatusNotification::class)->first();
        $push = $notification->toWebPush($this->applicant, $notification)->toArray();

        $this->assertSame("letter-{$this->letter->id}", $push['tag']);
        $this->assertSame(30, $push['data']['context']['reminder_days']);
        $this->assertSame(30, $push['data']['context']['days_left']);
    }

    public function test_marking_does_not_touch_updated_at(): void
    {
        $updatedAt = $this->letter->fresh()->updated_at;

        $this->at('2026-11-13 09:00');
        $this->runReminders(expectedSent: 1);

        $this->assertTrue($this->letter->fresh()->updated_at->equalTo($updatedAt));
    }

    public function test_command_is_scheduled_hourly(): void
    {
        $this->artisan('schedule:list')
            ->expectsOutputToContain('letters:send-expiry-reminders')
            ->assertSuccessful();
    }
}
