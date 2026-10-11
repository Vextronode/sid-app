<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Aksi "ubah data warga" biasanya menyasar pemohon sendiri. Untuk surat
 * yang subjeknya orang lain (mis. Penguburan: almarhum), kolom ini
 * menyebut isian form yang memuat NIK warga yang datanya diubah.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('letter_types', function (Blueprint $table) {
            $table->string('data_subject_field', 100)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('letter_types', function (Blueprint $table) {
            $table->dropColumn('data_subject_field');
        });
    }
};
