<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Data kop surat dan wilayah administratif desa. Sebelumnya tertulis
 * tetap di template surat (Kecamatan Parigi, Kabupaten Pangandaran, dst.),
 * sehingga template tidak bisa dipakai desa lain.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('villages', function (Blueprint $table) {
            $table->string('district', 100)->nullable();
            $table->string('regency', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->string('postal_code', 10)->nullable();
            $table->string('area_code', 10)->nullable();
            $table->string('email', 150)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('villages', function (Blueprint $table) {
            $table->dropColumn(['district', 'regency', 'province', 'postal_code', 'area_code', 'email']);
        });
    }
};
