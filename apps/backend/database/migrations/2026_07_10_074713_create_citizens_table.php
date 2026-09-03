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
        Schema::create('citizens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('village_id')->constrained()->cascadeOnDelete();
            $table->text('nik');
            $table->string('nik_hash')->unique();
            $table->string('name', 100);
            $table->date('date_of_birth');
            $table->string('place_of_birth', 100)->nullable();
            $table->enum('gender', ['L', 'P']);
            $table->text('address');
            $table->foreignId('rt_id')->nullable()->constrained('rts')->nullOnDelete();
            $table->foreignId('rw_id')->nullable()->constrained('rws')->nullOnDelete();
            $table->foreignId('hamlet_id')->nullable()->constrained()->nullOnDelete();
            $table->text('no_kk', 16)->nullable();
            $table->enum('marital_status', ['belum_kawin', 'kawin', 'cerai_hidup', 'cerai_mati'])->nullable();
            $table->string('occupation', 100)->nullable();
            $table->enum('religion', ['islam', 'kristen', 'katolik', 'hindu', 'budha', 'konghucu'])->nullable();
            $table->enum('last_education', ['tidak_sekolah', 'sd', 'smp', 'sma', 'd3', 's1', 's2', 's3'])->nullable();
            $table->enum('domicile_status', ['menetap', 'merantau_dalam_negeri', 'merantau_luar_negeri', 'tki'])->default('menetap');
            $table->string('current_domicile', 150)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('citizens');
    }
};
