<?php

namespace App\Console\Commands;

use App\Services\NotificationService;
use Illuminate\Console\Command;

/**
 * Menghapus notifikasi yang sudah dibaca lebih lama dari masa simpan
 * (config sid.notifications.read_retention_days), supaya tabel
 * notifications tidak tumbuh tanpa batas. Dijadwalkan harian
 * (routes/console.php).
 */
class PruneReadNotificationsCommand extends Command
{
    protected $signature = 'notifications:prune';

    protected $description = 'Hapus notifikasi yang sudah dibaca dan lewat masa simpan';

    public function handle(NotificationService $service): int
    {
        $deleted = $service->pruneRead();

        if ($deleted > 0) {
            $this->info("Notifikasi lama dihapus: {$deleted}.");
        }

        return self::SUCCESS;
    }
}
