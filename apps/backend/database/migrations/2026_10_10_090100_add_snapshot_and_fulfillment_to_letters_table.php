<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite membangun ulang tabel saat foreign key ditambahkan ke tabel
        // yang sudah ada, dan itu menghilangkan CHECK constraint kolom enum
        // (letters.status). Karena itu constraint FK hanya dipasang di
        // driver lain; di SQLite (test) kolomnya tetap ada tanpa FK.
        $withForeignKeys = Schema::getConnection()->getDriverName() !== 'sqlite';

        Schema::table('letters', function (Blueprint $table) use ($withForeignKeys) {
            // Data render yang dibekukan saat final approve, supaya surat
            // lama tidak berubah ketika Kades berganti, TTD diganti,
            // template diedit, atau data warga diperbarui.
            $table->json('snapshot')->nullable();
            $table->unsignedBigInteger('signed_by_official_id')->nullable();

            // Penanda aksi data (Terapkan) oleh Kasi/Kaur setelah final.
            $table->timestamp('fulfilled_at')->nullable();
            $table->uuid('fulfilled_by')->nullable();
            $table->json('fulfillment')->nullable();

            if ($withForeignKeys) {
                $table->foreign('signed_by_official_id')->references('id')->on('officials')->nullOnDelete();
                $table->foreign('fulfilled_by')->references('id')->on('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        $withForeignKeys = Schema::getConnection()->getDriverName() !== 'sqlite';

        Schema::table('letters', function (Blueprint $table) use ($withForeignKeys) {
            if ($withForeignKeys) {
                $table->dropForeign(['signed_by_official_id']);
                $table->dropForeign(['fulfilled_by']);
            }

            $table->dropColumn(['snapshot', 'signed_by_official_id', 'fulfilled_at', 'fulfilled_by', 'fulfillment']);
        });
    }
};
