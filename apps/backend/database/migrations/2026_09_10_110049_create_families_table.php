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
            $table->id();
            $table->foreignId('village_id')->constrained()->cascadeOnDelete();
            $table->text('no_kk');
            $table->string('no_kk_hash')->unique();
            $table->text('family_address');
            $table->enum('family_status', ['aktif', 'pindah', 'bubar'])->default('aktif');
            $table->foreignId('rt_id')->nullable()->constrained('rts')->nullOnDelete();
            $table->foreignId('rw_id')->nullable()->constrained('rws')->nullOnDelete();
            $table->foreignId('hamlet_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('head_of_family_id')->nullable();
            $table->timestamps();
        });

        Schema::table('families', function (Blueprint $table) {
            $table->foreign('head_of_family_id')
                ->references('id')->on('citizens')
                ->nullOnDelete();
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
