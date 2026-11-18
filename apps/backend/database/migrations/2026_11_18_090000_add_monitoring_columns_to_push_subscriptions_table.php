<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Kolom pemantauan untuk menu Pelanggan Notifikasi (Staf SIDUTama).
 * Ditambahkan lewat migration baru (bukan mengubah migration pembuat
 * tabel) agar data langganan yang sudah ada tetap utuh; semua kolom
 * nullable sehingga baris lama cukup tampil "belum teruji".
 *
 * - device_label: label ringkas "Browser · OS" dari User-Agent saat
 *   subscribe. User-Agent mentah sengaja tidak disimpan (minimalisasi data).
 * - last_success_at / last_failed_at: diisi listener event
 *   NotificationSent / NotificationFailed dari channel WebPush.
 */
return new class extends Migration
{
    public function up(): void
    {
        $connection = config('webpush.database_connection');
        $table = config('webpush.table_name');

        Schema::connection($connection)->table($table, function (Blueprint $blueprint): void {
            $blueprint->string('device_label', 100)->nullable()->after('content_encoding');
            $blueprint->timestamp('last_success_at')->nullable()->after('device_label');
            $blueprint->timestamp('last_failed_at')->nullable()->after('last_success_at');
        });
    }

    public function down(): void
    {
        $connection = config('webpush.database_connection');
        $table = config('webpush.table_name');

        Schema::connection($connection)->table($table, function (Blueprint $blueprint): void {
            $blueprint->dropColumn(['device_label', 'last_success_at', 'last_failed_at']);
        });
    }
};
