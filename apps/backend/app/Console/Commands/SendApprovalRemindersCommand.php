<?php

namespace App\Console\Commands;

use App\Services\ApprovalReminderService;
use Illuminate\Console\Command;

/**
 * Dijadwalkan tiap 5 menit di routes/console.php; dapat juga dijalankan
 * manual untuk memeriksa pengingat yang jatuh tempo.
 */
class SendApprovalRemindersCommand extends Command
{
    protected $signature = 'approvals:send-reminders';

    protected $description = 'Kirim pengingat ke approver untuk surat yang mendekati atau melewati deadline';

    public function handle(ApprovalReminderService $reminders): int
    {
        $sent = $reminders->sendDueReminders();

        $this->info("Pengingat approval terkirim: {$sent}.");

        return self::SUCCESS;
    }
}
