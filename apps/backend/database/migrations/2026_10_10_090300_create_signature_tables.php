<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Satu baris per percobaan mengisi saksi (atau persetujuan pihak
        // terkait) pada surat. Baris terbaru per slot adalah keadaan slot
        // saat ini; baris lama (ditolak/kedaluwarsa) dipertahankan sebagai
        // riwayat dan dasar pembatasan permintaan. Tidak ada TTD digital.
        Schema::create('letter_signatures', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('letter_id')
                ->constrained('letters')
                ->cascadeOnDelete();
            $table->string('slot_key', 50);
            $table->string('slot_label', 100);
            $table->string('signer_type', 20);
            $table->string('method', 20);
            $table->string('status', 20)->default('pending');
            $table->foreignUuid('requested_by')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('target_nik_hash', 64)->nullable();
            $table->foreignUuid('signer_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('signer_name', 100)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->text('response_notes')->nullable();
            $table->timestamps();

            $table->index(['letter_id', 'slot_key'], 'idx_letter_signatures_slot');
            $table->index(['target_nik_hash', 'status'], 'idx_letter_signatures_target');
            $table->index(['requested_by', 'target_nik_hash', 'status'], 'idx_letter_signatures_pair');
        });

        Schema::create('signature_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->foreignUuid('blocked_user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'blocked_user_id'], 'uq_signature_blocks_pair');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('signature_blocks');
        Schema::dropIfExists('letter_signatures');
    }
};
