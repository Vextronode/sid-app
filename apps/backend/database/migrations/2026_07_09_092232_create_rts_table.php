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
        Schema::create('rts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rw_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('village_id')->constrained()->cascadeOnDelete();
            $table->string('number');
            $table->string('full_label');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index('village_id', 'idx_rts_village');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rts');
    }
};
