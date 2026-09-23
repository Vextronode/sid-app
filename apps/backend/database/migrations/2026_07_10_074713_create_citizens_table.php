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
            $table->enum('blood_type', ['A', 'B', 'AB', 'O', 'tidak_tahu'])->nullable();
            $table->text('address');
            $table->foreignId('rt_id')->nullable()->constrained('rts')->nullOnDelete();
            $table->foreignId('rw_id')->nullable()->constrained('rws')->nullOnDelete();
            $table->foreignId('hamlet_id')->nullable()->constrained()->nullOnDelete();

            // EV5-3-S2: no_kk dipindah ke families.no_kk (EV5-3-S1). FK
            // constraint family_id -> families.id ditambahkan di migration
            // terpisah (2026_09_12_..._add_family_id_foreign_to_citizens_table)
            // karena families dibuat setelah citizens secara kronologis.
            $table->unsignedBigInteger('family_id')->nullable();
            $table->enum('family_role', ['kepala_keluarga', 'istri', 'suami', 'anak', 'famili_lain'])->nullable();
            $table->foreignId('father_id')->nullable()->constrained('citizens')->nullOnDelete();
            $table->foreignId('mother_id')->nullable()->constrained('citizens')->nullOnDelete();
            $table->string('father_name_text')->nullable();
            $table->string('mother_name_text')->nullable();

            $table->enum('marital_status', ['belum_kawin', 'kawin', 'cerai_hidup', 'cerai_mati'])->nullable();
            $table->string('occupation', 100)->nullable();
            $table->enum('religion', ['islam', 'kristen', 'katolik', 'hindu', 'buddha', 'konghucu'])->nullable();
            $table->enum('last_education', ['tidak_sekolah', 'sd', 'smp', 'sma', 'diploma', 's1', 's2', 's3'])->nullable();
            $table->enum('domicile_status', ['menetap', 'merantau_dalam_negeri', 'merantau_luar_negeri', 'tki'])->default('menetap');
            $table->string('current_domicile', 150)->nullable();

            $table->enum('residency_type', ['lokal', 'pendatang'])->default('lokal');
            $table->string('origin_region')->nullable();

            $table->enum('data_source', ['manual_input_desa', 'import_excel', 'dukcapil_sync'])->default('manual_input_desa');
            $table->timestamp('last_verified_at')->nullable();
            $table->enum('sync_status', ['synced', 'pending', 'conflict'])->nullable();

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
