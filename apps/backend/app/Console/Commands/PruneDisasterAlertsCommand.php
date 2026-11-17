<?php

namespace App\Console\Commands;

use App\Services\DisasterAlertService;
use Illuminate\Console\Command;

/**
 * Menghapus peringatan SIGAP yang berakhir atau kedaluwarsa lebih lama dari
 * masa simpan (config disaster_alerts.retention_days). Dijadwalkan harian
 * (routes/console.php).
 */
class PruneDisasterAlertsCommand extends Command
{
    protected $signature = 'disaster-alerts:prune';

    protected $description = 'Hapus peringatan bencana SIGAP yang sudah lewat masa simpan';

    public function handle(DisasterAlertService $service): int
    {
        $deleted = $service->prune();

        if ($deleted > 0) {
            $this->info("Peringatan bencana lama dihapus: {$deleted}.");
        }

        return self::SUCCESS;
    }
}
