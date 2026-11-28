<?php

declare(strict_types=1);

namespace Database\Seeders;

use Database\Seeders\Support\DemoData;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Data demo Desa Cibenda untuk development/testing: desa dan wilayahnya,
 * data acuan desa itu, warga, perangkat desa, akun demo, dan berita.
 * Menolak environment production.
 */
class DemoDataSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        DemoData::ensureNotProduction();

        $this->call([
            DemoVillageSeeder::class,
            // Warga, perangkat, dan berita demo memakai jabatan, pekerjaan,
            // dan kategori berita dari data acuan desa demo.
            ReferenceDataSeeder::class,
            DemoCitizenSeeder::class,
            DemoOfficialSeeder::class,
            DemoNewsSeeder::class,
        ]);
    }
}
