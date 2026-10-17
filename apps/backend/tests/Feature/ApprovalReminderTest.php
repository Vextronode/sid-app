<?php

namespace Tests\Feature;

use App\Models\ApprovalSetting;
use App\Models\Letter;
use App\Models\LetterApproval;
use App\Models\User;
use App\Models\Village;
use App\Notifications\LetterStatusNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * UC-22. Pengingat approval dikirim sekali saat sisa waktu menuju
 * deadline tinggal reminder_hours (approvals:send-reminders).
 */
class ApprovalReminderTest extends TestCase
{
    use BuildsLetterScenario;
    use RefreshDatabase;

    private Village $village;

    private User $rtUser;

    private Letter $letter;

    private LetterApproval $approval;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->travelTo(now()->startOfHour());

        $this->village = Village::factory()->create();
        ['rt' => $rt] = $area = $this->makeArea($this->village);
        ['user' => $this->rtUser] = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        ['citizen' => $citizen, 'user' => $applicant] = $this->makeCitizenAccount($this->village, $rt);

        $flow = $this->makeDefaultFlow();
        $this->letter = Letter::factory()->create([
            'village_id' => $this->village->id,
            'flow_id' => $flow->id,
            'citizen_id' => $citizen->id,
            'submitted_by' => $applicant->id,
            'status' => 'pending',
            'current_step_order' => 1,
        ]);
        $this->approval = LetterApproval::query()->create([
            'letter_id' => $this->letter->id,
            'approval_level' => 'rt',
            'flow_step_id' => $flow->steps()->where('step_order', 1)->value('id'),
            'deadline_at' => now()->addHours(24),
        ]);

        $this->setting(deadline: 24, reminder: 12);
    }

    private function setting(int $deadline, int $reminder, bool $active = true): void
    {
        ApprovalSetting::query()->updateOrCreate(
            ['village_id' => $this->village->id, 'approval_level' => 'rt'],
            ['deadline_hours' => $deadline, 'reminder_hours' => $reminder, 'is_active' => $active],
        );
    }

    private function runReminders(): void
    {
        $this->artisan('approvals:send-reminders')->assertSuccessful();
    }

    public function test_no_reminder_before_window_opens(): void
    {
        $this->travel(11)->hours();

        $this->runReminders();

        Notification::assertNothingSent();
        $this->assertNull($this->approval->fresh()->reminded_at);
    }

    public function test_sends_one_reminder_to_active_step_approver_inside_window(): void
    {
        $this->travel(13)->hours();

        $this->artisan('approvals:send-reminders')
            ->expectsOutput('Pengingat approval terkirim: 1.')
            ->assertSuccessful();

        Notification::assertSentTo(
            $this->rtUser,
            LetterStatusNotification::class,
            fn (LetterStatusNotification $notification) => $notification->toArray($this->rtUser)['title'] === 'Pengingat Persetujuan Surat'
                && $notification->toArray($this->rtUser)['context']['status'] === 'approval_reminder',
        );
        $this->assertNotNull($this->approval->fresh()->reminded_at);

        $this->travel(1)->hours();
        $this->runReminders();

        Notification::assertSentToTimes($this->rtUser, LetterStatusNotification::class, 1);
    }

    public function test_zero_reminder_hours_reminds_at_deadline(): void
    {
        $this->setting(deadline: 24, reminder: 0);

        $this->travel(23)->hours();
        $this->runReminders();
        Notification::assertNothingSent();

        $this->travel(1)->hours();
        $this->runReminders();
        Notification::assertSentToTimes($this->rtUser, LetterStatusNotification::class, 1);
    }

    public function test_changed_reminder_hours_apply_to_waiting_letters(): void
    {
        $this->travel(5)->hours();
        $this->runReminders();
        Notification::assertNothingSent();

        $this->setting(deadline: 24, reminder: 20);
        $this->runReminders();

        Notification::assertSentToTimes($this->rtUser, LetterStatusNotification::class, 1);
    }

    public function test_overdue_letter_never_reminded_still_gets_one_reminder(): void
    {
        $this->travel(30)->hours();

        $this->runReminders();

        Notification::assertSentToTimes($this->rtUser, LetterStatusNotification::class, 1);
    }

    public function test_inactive_setting_sends_nothing(): void
    {
        $this->setting(deadline: 24, reminder: 12, active: false);
        $this->travel(13)->hours();

        $this->runReminders();

        Notification::assertNothingSent();
    }

    public function test_decided_or_finished_or_inactive_step_is_skipped(): void
    {
        $this->travel(13)->hours();

        $this->approval->update(['approved_by' => $this->rtUser->id, 'action' => 'approved']);
        $this->runReminders();
        Notification::assertNothingSent();

        $this->approval->update(['approved_by' => null, 'action' => null]);
        $this->letter->update(['status' => 'rejected']);
        $this->runReminders();
        Notification::assertNothingSent();

        $this->letter->update(['status' => 'in_progress', 'current_step_order' => 2]);
        $this->runReminders();
        Notification::assertNothingSent();
    }

    public function test_vacant_step_is_marked_and_not_retried(): void
    {
        $this->rtUser->official()->update(['is_active' => false]);
        $this->travel(13)->hours();

        $this->artisan('approvals:send-reminders')
            ->expectsOutput('Pengingat approval terkirim: 0.')
            ->assertSuccessful();

        Notification::assertNothingSent();
        $this->assertNotNull($this->approval->fresh()->reminded_at);
    }

    public function test_command_is_scheduled_every_five_minutes(): void
    {
        $this->artisan('schedule:list')
            ->expectsOutputToContain('approvals:send-reminders')
            ->assertSuccessful();
    }
}
