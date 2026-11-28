<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Data acuan milik developer yang ikut pembaruan aplikasi: alur persetujuan,
 * tahap persetujuan yang belum punya setting, titik pengingat masa berlaku,
 * jenis surat, dan slot organisasi desa. Dipakai ReferenceDataSeeder saat
 * pemasangan dan sid:sync-reference-data setelah rilis.
 *
 * Aman dijalankan ulang pada desa yang sudah berjalan: baris baru dibuat,
 * struktur jenis surat diperbarui, tetapi pengaturan desa (kategori/petugas,
 * masa berlaku, dan status aktif jenis surat; tenggat persetujuan; nyala/mati
 * pengingat) tidak ditimpa.
 */
class ReferenceDataSyncSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            ApprovalFlowSeeder::class,
            ApprovalSettingSeeder::class,
            LetterExpiryReminderSettingSeeder::class,
            LetterTypeSeeder::class,
            ServiceLetterTypeSeeder::class,
            VillageOrgPositionSeeder::class,
        ]);
    }
}
