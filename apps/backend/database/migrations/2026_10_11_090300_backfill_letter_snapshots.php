<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;

/**
 * Surat yang sudah approved sebelum snapshot ada dibekukan sekarang,
 * bukan menunggu unduhan pertama. Aman dijalankan ulang kapan pun lewat
 * `php artisan letters:backfill-snapshots`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Artisan::call('letters:backfill-snapshots');
    }

    public function down(): void
    {
        // Snapshot adalah arsip; tidak dihapus saat rollback.
    }
};
