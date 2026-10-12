<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * EV5-3-S1 (families) sudah selesai (track A) - tambahkan FK constraint
     * yang sengaja ditunda saat citizens.family_id dibuat di EV5-3-S2,
     * karena families belum ada saat itu.
     */
    public function up(): void
    {
        Schema::table('citizens', function (Blueprint $table) {
            $table->foreign('family_id')
                ->references('id')->on('families')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('citizens', function (Blueprint $table) {
            $table->dropForeign(['family_id']);
        });
    }
};
