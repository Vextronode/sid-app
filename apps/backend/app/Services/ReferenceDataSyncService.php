<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\LetterType;
use App\Models\Village;
use Database\Seeders\ReferenceDataSyncSeeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Pembaruan data acuan desa yang sudah berjalan setelah rilis aplikasi
 * (sid:sync-reference-data): jenis surat baru ditambahkan dan struktur jenis
 * surat yang ada diperbarui, tanpa menimpa pengaturan desa. Lihat
 * ReferenceDataSyncSeeder untuk cakupannya.
 */
class ReferenceDataSyncService
{
    /**
     * @return array{new_letter_types: list<string>}
     *
     * @throws RuntimeException belum ada desa
     */
    public function sync(): array
    {
        if (! Village::query()->exists()) {
            throw new RuntimeException('Belum ada desa. Pasang desa terlebih dahulu dengan php artisan sid:install.');
        }

        return DB::transaction(function (): array {
            $existingIds = LetterType::query()->pluck('id');

            app(ReferenceDataSyncSeeder::class)->setContainer(app())->__invoke();

            return [
                'new_letter_types' => LetterType::query()
                    ->whereNotIn('id', $existingIds)
                    ->orderBy('code')
                    ->pluck('code')
                    ->unique()
                    ->values()
                    ->all(),
            ];
        });
    }
}
