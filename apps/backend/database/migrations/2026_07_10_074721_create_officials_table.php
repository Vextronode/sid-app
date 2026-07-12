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
        Schema::create('officials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('position', ['rt', 'rw', 'kadus', 'kasi_pelayanan', 'kaur_tu_umum']);
            $table->foreignId('hamlet_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('rw_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('rt_id')->nullable()->constrained()->nullOnDelete();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('officials');
    }
};
