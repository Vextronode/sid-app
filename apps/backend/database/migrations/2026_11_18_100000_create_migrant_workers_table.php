<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Data Calon Pekerja Migran Indonesia (CPMI) dari pengajuan F11 yang
        // disetujui Kepala Desa. Satu baris per keberangkatan (per
        // pengajuan), jadi riwayat penempatan warga tetap utuh. Identitas
        // dibaca dari citizens; 10 dokumen wajib tetap berupa
        // letter_attachments milik pengajuannya (letter_id).
        Schema::create('migrant_workers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('village_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('citizen_id')->nullable()->constrained('citizens')->nullOnDelete();
            $table->foreignUuid('letter_id')->unique()->constrained('letters')->cascadeOnDelete();

            $table->unsignedSmallInteger('height_cm')->nullable();
            $table->unsignedSmallInteger('weight_kg')->nullable();
            // Terenkripsi, jadi `text`.
            $table->text('phone')->nullable();
            $table->text('email')->nullable();

            $table->string('education_level', 30)->nullable();
            $table->string('school_name')->nullable();
            $table->string('major')->nullable();
            $table->unsignedSmallInteger('graduation_year')->nullable();
            $table->json('certificates')->nullable();
            $table->text('work_history')->nullable();

            $table->string('guardian_relation', 30)->nullable();
            $table->string('guardian_name')->nullable();
            $table->text('guardian_address')->nullable();
            $table->text('guardian_phone')->nullable();
            $table->text('guardian_email')->nullable();

            $table->string('destination_country', 100);
            $table->string('employer_name')->nullable();
            $table->text('employer_address')->nullable();
            $table->text('employer_contact')->nullable();
            // P3MI/agensi penempatan; kosong bila berangkat tanpa agensi.
            $table->string('agency_name')->nullable();
            $table->string('agency_contact', 50)->nullable();
            $table->string('position')->nullable();
            $table->text('salary_facilities')->nullable();
            $table->date('contract_start')->nullable();
            $table->date('contract_end')->nullable();
            $table->timestamps();

            $table->index(['village_id', 'destination_country'], 'idx_migrant_workers_village_country');
            $table->index(['village_id', 'contract_end'], 'idx_migrant_workers_village_contract_end');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('migrant_workers');
    }
};
