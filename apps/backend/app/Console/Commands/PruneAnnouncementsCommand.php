<?php

namespace App\Console\Commands;

use App\Services\AnnouncementService;
use Illuminate\Console\Command;

/**
 * Menghapus pengumuman beranda yang sudah lewat waktu tayangnya.
 * Dijadwalkan tiap menit (routes/console.php).
 */
class PruneAnnouncementsCommand extends Command
{
    protected $signature = 'announcements:prune';

    protected $description = 'Hapus pengumuman beranda yang sudah lewat waktu tayang';

    public function handle(AnnouncementService $service): int
    {
        $deleted = $service->pruneExpired();

        if ($deleted > 0) {
            $this->info("Pengumuman kedaluwarsa dihapus: {$deleted}.");
        }

        return self::SUCCESS;
    }
}
