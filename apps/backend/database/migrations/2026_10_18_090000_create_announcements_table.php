<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pengumuman di bagian atas beranda publik. Satu pengumuman per desa;
     * menyimpan yang baru menggantikan yang lama. Baris kedaluwarsa dihapus
     * perintah announcements:prune (terjadwal tiap menit).
     */
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('village_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('title', 150);
            $table->text('body')->nullable();
            // URL https:// atau path internal ("/berita/12").
            $table->string('link_url', 500)->nullable();
            $table->timestamp('expires_at')->index();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};
