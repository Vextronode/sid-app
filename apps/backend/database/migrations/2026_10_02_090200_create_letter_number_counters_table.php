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
        Schema::create('letter_number_counters', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('village_id')->constrained()->cascadeOnDelete();
            $table->foreignId('letter_type_id')->constrained()->cascadeOnDelete();
            $table->smallInteger('year');
            $table->unsignedInteger('last_number')->default(0);
            $table->timestamps();
            $table->unique(['village_id', 'letter_type_id', 'year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('letter_number_counters');
    }
};
