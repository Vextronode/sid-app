<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Hanya untuk development/testing: data demo lengkap. Desa sungguhan
     * dipasang dengan sid:install (desa + data acuan), lalu data acuannya
     * diperbarui setelah rilis dengan sid:sync-reference-data.
     */
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('db:seed tidak dipakai di production. Pasang desa dengan php artisan sid:install; setelah pembaruan aplikasi, jalankan php artisan sid:sync-reference-data.');
        }

        $this->call(DemoDataSeeder::class);
    }
}
