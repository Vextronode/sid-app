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
        Schema::create('approval_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('village_id')
                ->constrained('villages')
                ->cascadeOnDelete();

            $table->enum('approval_level', [
                'rt',
                'kepala_desa',
                'sekdes',
                'kasi_pelayanan',
                'kaur_tu_umum',
            ]);

            $table->unsignedInteger('deadline_hours')->default(24);
            $table->unsignedInteger('reminder_hours')->default(12);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['village_id', 'approval_level'], 'uq_approval_settings_village_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_settings');
    }
};
