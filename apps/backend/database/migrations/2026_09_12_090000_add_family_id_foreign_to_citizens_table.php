<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * EV5-3-S1 (families) sudah selesai (track A) - tambahkan FK constraint
     * yang sengaja ditunda saat citizens.family_id dibuat di EV5-3-S2,
     * karena families belum ada saat itu.
     */
    public function up(): void
    {
        Schema::table('citizens', function (Blueprint $table) {
            $table->foreign('family_id')
                ->references('id')->on('families')
                ->nullOnDelete();
        });

        // Satu kepala keluarga aktif per KK, dijaga juga di database (guard
        // di CitizenService hanya cek-lalu-tulis tanpa lock). Partial index
        // dibuat di sini, bukan di create_citizens: di SQLite penambahan FK
        // di atas membangun ulang tabel dan mengubah partial index menjadi
        // unique index biasa (klausa WHERE hilang).
        DB::statement(
            'CREATE UNIQUE INDEX citizens_single_active_head_unique ON citizens (family_id) '
            ."WHERE family_role = 'kepala_keluarga' AND is_active"
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS citizens_single_active_head_unique');

        Schema::table('citizens', function (Blueprint $table) {
            $table->dropForeign(['family_id']);
        });
    }
};
