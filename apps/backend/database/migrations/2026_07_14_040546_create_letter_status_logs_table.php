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
        Schema::create('letter_status_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('letter_id')->constrained('letters')->cascadeOnDelete();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();

            $table->enum('old_status', [
                'pending',
                'rt_approved', 'rt_rejected',
                'rw_approved', 'rw_rejected',
                'kadus_approved', 'kadus_rejected',
                'kasi_approved', 'kasi_rejected',
            ])->nullable();

            $table->enum('new_status', [
                'pending',
                'rt_approved', 'rt_rejected',
                'rw_approved', 'rw_rejected',
                'kadus_approved', 'kadus_rejected',
                'kasi_approved', 'kasi_rejected',
            ]);

            $table->text('reason')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('letter_status_logs');
    }
};
