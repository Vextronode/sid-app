<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // TTD pribadi melekat ke akun. Diisi sekali; reset oleh Petugas
        // Desa menandai baris lama (revoked_at) tanpa menghapus filenya,
        // sehingga dokumen lama tetap dapat dirender.
        Schema::create('user_signatures', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('path');
            $table->string('mime_type', 50);
            $table->timestamp('revoked_at')->nullable();
            $table->foreignUuid('revoked_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->text('revoke_reason')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'revoked_at'], 'idx_user_signatures_active');
        });

        // Pengajuan reset TTD oleh pemilik akun, diputuskan Staf SIDUTama.
        // Maksimal satu pengajuan pending per akun (ditegakkan di service).
        Schema::create('signature_reset_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->text('reason');
            $table->string('status', 20)->default('pending');
            $table->foreignUuid('handled_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('handled_at')->nullable();
            $table->text('response_notes')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at'], 'idx_signature_reset_requests_status');
            $table->index(['user_id', 'status'], 'idx_signature_reset_requests_user');
        });

        // Satu baris per percobaan mengisi sebuah slot tanda tangan pada
        // surat. Baris terbaru per slot adalah keadaan slot saat ini;
        // baris lama (ditolak/kedaluwarsa) dipertahankan sebagai riwayat
        // dan dasar pembatasan permintaan.
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
            $table->foreignId('user_signature_id')
                ->nullable()
                ->constrained('user_signatures')
                ->nullOnDelete();
            $table->foreignId('attachment_id')
                ->nullable()
                ->constrained('letter_attachments')
                ->nullOnDelete();
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
        Schema::dropIfExists('signature_reset_requests');
        Schema::dropIfExists('user_signatures');
    }
};
