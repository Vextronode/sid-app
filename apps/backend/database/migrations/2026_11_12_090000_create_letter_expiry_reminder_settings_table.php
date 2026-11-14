<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Titik pengingat masa berlaku surat (H-30, H-14, H-7, H-3, H-1) per
     * desa. Hari H tidak punya baris karena selalu dikirim.
     */
    public function up(): void
    {
        Schema::create('letter_expiry_reminder_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('village_id')
                ->constrained('villages')
                ->cascadeOnDelete();
            $table->unsignedSmallInteger('days_before');
            $table->boolean('is_active')->default(true);
            // Waktu titik terakhir dinyalakan: jatuh tempo sebelum waktu
            // ini tidak dikirim, agar menyalakan titik tidak memicu
            // pengingat serentak.
            $table->timestamp('activated_at')->nullable();
            $table->timestamps();

            $table->unique(['village_id', 'days_before'], 'uq_letter_expiry_reminder_settings_village_days');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letter_expiry_reminder_settings');
    }
};
