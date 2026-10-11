<?php

namespace App\Console\Commands;

use App\Enums\LetterStatus;
use App\Models\Letter;
use App\Services\LetterSnapshotService;
use Illuminate\Console\Command;

/**
 * Membekukan data render untuk surat yang sudah approved sebelum fitur
 * snapshot ada. Tanpa ini surat lama baru dibekukan saat pertama kali
 * diunduh, sehingga perubahan Kades, template, atau data warga di antara
 * waktu itu masih ikut terbawa.
 */
class BackfillLetterSnapshots extends Command
{
    protected $signature = 'letters:backfill-snapshots';

    protected $description = 'Bekukan data render surat approved yang belum punya snapshot';

    public function handle(LetterSnapshotService $snapshots): int
    {
        $captured = 0;
        $skipped = 0;

        Letter::query()
            ->where('status', LetterStatus::Approved->value)
            ->whereNull('snapshot')
            ->orderBy('id')
            ->chunkById(100, function ($letters) use ($snapshots, &$captured, &$skipped): void {
                foreach ($letters as $letter) {
                    $snapshots->captureOnFinalApproval($letter);

                    // Desa tanpa Kepala Desa aktif belum bisa dibekukan.
                    $letter->snapshot !== null ? $captured++ : $skipped++;
                }
            });

        $this->info("Snapshot dibuat: {$captured}. Dilewati (belum ada Kepala Desa aktif): {$skipped}.");

        return self::SUCCESS;
    }
}
