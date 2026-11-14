<?php

namespace App\Console\Commands;

use App\Services\LetterExpiryReminderService;
use Illuminate\Console\Command;

/**
 * Dijadwalkan tiap jam di routes/console.php; dapat juga dijalankan manual
 * untuk memeriksa pengingat masa berlaku yang jatuh tempo.
 */
class SendLetterExpiryRemindersCommand extends Command
{
    protected $signature = 'letters:send-expiry-reminders';

    protected $description = 'Kirim pengingat ke pemohon untuk surat yang akan atau sudah kedaluwarsa';

    public function handle(LetterExpiryReminderService $reminders): int
    {
        ['sent' => $sent, 'failed' => $failed] = $reminders->sendDueReminders();

        $this->info("Pengingat masa berlaku surat terkirim: {$sent}.");

        // Surat yang gagal sudah dicatat ke log dan dicoba lagi di run
        // berikutnya; status gagal membuatnya terlihat di log scheduler.
        if ($failed > 0) {
            $this->error("Gagal diproses: {$failed} (lihat log).");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
