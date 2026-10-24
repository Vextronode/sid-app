<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('letter_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('letter_id')
                ->constrained('letters')
                ->cascadeOnDelete();
            // attachment: lampiran umum; field: isian bertipe file;
            // wet_signature: foto dokumen ber-TTD basah untuk sebuah slot;
            // result: berkas hasil dari instansi luar (letter_result_id).
            $table->string('kind', 30)->default('attachment');
            $table->foreignId('letter_result_id')
                ->nullable()
                ->constrained('letter_results')
                ->cascadeOnDelete();
            $table->string('field', 100)->nullable();
            $table->string('original_name');
            $table->string('path');
            $table->string('mime_type', 100);
            $table->unsignedInteger('size');
            $table->foreignUuid('uploaded_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();

            $table->index(['letter_id', 'kind'], 'idx_attachments_letter_kind');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letter_attachments');
    }
};
