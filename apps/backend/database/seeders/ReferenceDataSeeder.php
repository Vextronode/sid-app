<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Data acuan bawaan untuk setiap desa yang sudah ada, diisi saat desa
 * dipasang (sid:install) dan oleh DemoDataSeeder. Tidak bergantung pada data
 * demo. Bila belum ada desa, tidak ada yang diisi.
 *
 * Katalog di bawah ini (jenis jabatan, kategori berita, pekerjaan) hanya diisi
 * saat pemasangan: setelahnya dikelola desa, termasuk dihapus, jadi tidak
 * ikut sid:sync-reference-data supaya bawaan yang sudah dihapus tidak muncul
 * lagi. Sisanya ada di ReferenceDataSyncSeeder.
 */
class ReferenceDataSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            OfficialPositionTypeSeeder::class,
            NewsCategorySeeder::class,
            OccupationSeeder::class,
            ReferenceDataSyncSeeder::class,
        ]);
    }
}
