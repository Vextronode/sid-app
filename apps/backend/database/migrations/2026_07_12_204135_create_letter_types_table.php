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
        Schema::create('letter_types', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('village_id')
                ->constrained('villages')
                ->cascadeOnDelete();
            $table->string('code', 20);
            $table->string('name');
            $table->text('description')->nullable();
            // Persuratan Desa / Layanan Kependudukan (App\Enums\LetterTypeCategory).
            $table->string('category', 20)->default('persuratan');
            $table->text('template')->nullable();
            // Dokumen yang terbit bersama dokumen utama: [{key, title, template, when?}]
            // (App\Support\LetterDocuments).
            $table->json('documents')->nullable();
            $table->enum('verification_type', ['manual', 'auto', 'document']);
            $table->text('requirement_info')->nullable();
            $table->enum('assigned_role', ['kasi_pemerintahan', 'kaur_tu_umum'])->nullable();
            $table->foreignId('category_id')->after('assigned_role')->constrained('letter_categories');
            $table->foreignId('flow_id')->after('category_id')->constrained('approval_flows');
            $table->unsignedInteger('validity_days')->nullable();
            // Formulir pelayanan (format instansi luar) tidak bernomor surat
            // desa dan tidak ditandatangani/distempel Kepala Desa.
            $table->boolean('issues_letter_number')->default(true);
            $table->boolean('signed_by_village_head')->default(true);
            // Setelah terbit, pemohon mengunggah hasil dari instansi luar
            // (mis. KK baru dari Disdukcapil) untuk diverifikasi Kasi/Kaur.
            $table->boolean('requires_result_upload')->default(false);
            $table->text('result_upload_hint')->nullable();
            // Petunjuk bagi Kasi/Kaur untuk aksi data `manual`.
            $table->text('data_instructions')->nullable();
            $table->boolean('is_active');
            $table->timestamps();

            $table->unique(['village_id', 'code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('letter_types');
    }
};
