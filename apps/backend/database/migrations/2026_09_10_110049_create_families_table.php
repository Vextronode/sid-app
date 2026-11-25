<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('families', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('village_id')->constrained()->cascadeOnDelete();
            $table->text('no_kk');
            $table->string('no_kk_hash')->unique();
            $table->text('family_address');
            $table->enum('family_status', ['aktif', 'pindah', 'bubar'])->default('aktif');
            // NO ACTION: warga/wilayah yang masih dirujuk tidak bisa dihapus.
            // ReferenceRepository menolaknya lebih dulu dengan pesan 409.
            $table->foreignId('rt_id')->nullable()->constrained('rts')->noActionOnDelete();
            $table->foreignId('rw_id')->nullable()->constrained('rws')->noActionOnDelete();
            $table->foreignId('hamlet_id')->nullable()->constrained()->noActionOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('families');
    }
};
