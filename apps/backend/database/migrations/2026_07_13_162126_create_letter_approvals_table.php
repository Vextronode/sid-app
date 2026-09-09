<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('letter_approvals', function (Blueprint $table) {
            $table->id();

            $table->foreignId('letter_id')
                ->constrained('letters')
                ->cascadeOnDelete();

            $table->foreignId('approved_by')
                ->nullable()
                ->constrained('users')
                ->restrictOnDelete();

            $table->enum('approval_level', [
                'rt',
                'kepala_desa',
                'sekdes',
                'kasi_pelayanan',
                'kaur_tu_umum',
            ]);

            $table->foreignId('flow_step_id')
                ->nullable()
                ->constrained('flow_steps')
                ->nullOnDelete();

            $table->enum('action', ['approved', 'rejected'])->nullable();
            $table->text('notes')->nullable();

            $table->timestamp('deadline_at')->nullable();
            $table->timestamp('reminded_at')->nullable();

            $table->timestamps();

            // TDD "Indexing Strategy - Table letter_approvals":
            //   idx_approvals_letter — semua approval untuk 1 surat.
            $table->index('letter_id', 'idx_approvals_letter');

            // idx_approvals_deadline — scheduler cek deadline yang
            // terlewat (SendApprovalReminderJob).
            $table->index('deadline_at', 'idx_approvals_deadline');

            // idx_approvals_level — cek apakah sudah ada approval tahap
            // tertentu untuk surat tertentu.
            $table->index(['letter_id', 'approval_level'], 'idx_approvals_level');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letter_approvals');
    }
};
