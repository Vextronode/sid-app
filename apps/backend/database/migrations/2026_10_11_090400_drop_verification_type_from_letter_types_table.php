<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jenis verifikasi (manual/auto/document) adalah sisa rancangan lama.
 * Semua jenis surat memakai alur persetujuan yang sama; yang membedakan
 * hanya isian form dan keluarannya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('letter_types', function (Blueprint $table) {
            $table->dropColumn('verification_type');
        });
    }

    public function down(): void
    {
        Schema::table('letter_types', function (Blueprint $table) {
            $table->string('verification_type', 20)->default('manual');
        });
    }
};
