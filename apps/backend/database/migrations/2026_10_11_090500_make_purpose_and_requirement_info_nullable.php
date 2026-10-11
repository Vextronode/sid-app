<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Keperluan" bukan lagi isian umum semua surat, dan baris persyaratan
 * (KTP/KK) dihapus karena NIK terdaftar sudah menjadi validasinya.
 *
 * Migration create sudah menjadikan kedua kolom nullable untuk database
 * baru; migration ini menyesuaikan database yang sudah ada. Di SQLite
 * (test) dilewati: mengubah kolom membangun ulang tabel dan menghilangkan
 * CHECK constraint kolom enum (letters.status), dan databasenya selalu
 * dibuat dari migration create.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('letters', function (Blueprint $table) {
            $table->text('purpose')->nullable()->change();
        });

        Schema::table('letter_types', function (Blueprint $table) {
            $table->text('requirement_info')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Baris tanpa keperluan/persyaratan tidak dapat dikembalikan ke NOT NULL.
    }
};
