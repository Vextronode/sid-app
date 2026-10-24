<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hasil dari instansi luar (mis. KK atau akta dari Disdukcapil) yang
 * diunggah pemohon setelah formulir pelayanan terbit, lalu diverifikasi
 * Kasi/Kaur yang ditugaskan. Satu baris per unggahan; unggahan yang
 * ditolak tetap tersimpan sebagai riwayat. Berkasnya di letter_attachments
 * (kind `result`).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('letter_results', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('letter_id')
                ->constrained('letters')
                ->cascadeOnDelete();
            // submitted: menunggu verifikasi; accepted / rejected: sudah ditinjau.
            $table->string('status', 20)->default('submitted');
            $table->foreignUuid('submitted_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignUuid('reviewed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();

            $table->index(['letter_id', 'id'], 'idx_letter_results_letter');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letter_results');
    }
};
