<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Nomor surat mengikuti format kantor desa:
 * {kode klasifikasi}/{nomor urut}/Des/{bulan Romawi}/{tahun}, mis.
 * 470/001/Des/X/2026. Beberapa jenis surat berbagi kode klasifikasi yang
 * sama, jadi nomor urut dihitung per desa + kode klasifikasi + tahun
 * (bukan lagi per jenis surat) supaya nomornya tidak bentrok.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('letter_types', function (Blueprint $table) {
            $table->string('classification_code', 10)->default('470');
        });

        Schema::table('letter_number_counters', function (Blueprint $table) {
            $table->dropUnique(['village_id', 'letter_type_id', 'year']);
        });

        Schema::table('letter_number_counters', function (Blueprint $table) {
            // Baris lama (per jenis surat, format nomor lama) dipertahankan
            // sebagai riwayat; baris baru hanya mengisi classification_code.
            $table->unsignedBigInteger('letter_type_id')->nullable()->change();
            $table->string('classification_code', 10)->nullable();
            $table->unique(['village_id', 'classification_code', 'year'], 'uq_letter_counters_classification');
        });
    }

    public function down(): void
    {
        Schema::table('letter_number_counters', function (Blueprint $table) {
            $table->dropUnique('uq_letter_counters_classification');
            $table->dropColumn('classification_code');
        });

        Schema::table('letter_number_counters', function (Blueprint $table) {
            $table->unique(['village_id', 'letter_type_id', 'year']);
        });

        Schema::table('letter_types', function (Blueprint $table) {
            $table->dropColumn('classification_code');
        });
    }
};
