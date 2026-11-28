<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\ReferenceDataSyncService;
use Illuminate\Console\Command;
use Illuminate\Console\ConfirmableTrait;
use RuntimeException;

class SidSyncReferenceDataCommand extends Command
{
    use ConfirmableTrait;

    protected $signature = 'sid:sync-reference-data
        {--force : Jalankan di production tanpa konfirmasi}';

    protected $description = 'Memperbarui data acuan desa (jenis surat, alur persetujuan, dsb.) setelah pembaruan aplikasi tanpa menimpa pengaturan desa.';

    public function handle(ReferenceDataSyncService $syncService): int
    {
        if (! $this->confirmToProceed()) {
            return self::FAILURE;
        }

        try {
            $result = $syncService->sync();
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $newLetterTypes = $result['new_letter_types'];

        $this->info('Data acuan desa diperbarui.');
        $this->line($newLetterTypes === []
            ? 'Tidak ada jenis surat baru.'
            : 'Jenis surat baru: '.implode(', ', $newLetterTypes).'.');
        $this->line('Pengaturan desa tidak diubah: kategori, masa berlaku, dan status aktif jenis surat; tenggat persetujuan; nyala/mati pengingat masa berlaku.');

        return self::SUCCESS;
    }
}
