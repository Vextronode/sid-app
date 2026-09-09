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
                'in_progress',
                'approved',
                'rejected',
            ])->nullable();

            $table->enum('new_status', [
                'pending',
                'in_progress',
                'approved',
                'rejected',
            ]);
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->index('letter_id', 'idx_logs_letter');
            $table->index('created_at', 'idx_logs_created');
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
