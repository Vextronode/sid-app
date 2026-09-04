<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sumber:
 *  - TDD v5.0 Section 5.4.2
 *  - SID-ARCH-BE-001 S3.2, S3.3
 *  - ERD Core v7 (entity FSTEP)
 *
 * Urutan approver per flow. Paling kritis di v5.0 — dipanggil di SETIAP
 * pengecekan gate approval (idx_flowsteps_flow_order, TDD Table 42).
 *
 * ⚠️ PENTING: 'rw' dan 'kadus' TIDAK PERNAH muncul sebagai
 * approver_position di tabel ini:
 *  - RW ditangani sebagai side-effect notifikasi kode (non-blocking FYI),
 *    bukan step approval formal. Endpoint decision/approval TIDAK PERNAH
 *    dibuka untuk role RW di level route (SID-ARCH-BE-001 S3.2).
 *  - Kadus dihapus total dari alur approval sejak v5.0 (Patch 37).
 *
 * Dependensi: approval_flows (EV5-1-S2) HARUS sudah ada.
 */

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('flow_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('flow_id')
                ->constrained('approval_flows')
                ->cascadeOnDelete();
            $table->integer('step_order');
            $table->enum('approver_position', [
                'rt',
                'kepala_desa',
                'sekdes',
                'kasi_pelayanan',
                'kaur_tu_umum',
            ]);
            $table->boolean('is_final')->default(false);
            $table->timestamps();

            $table->unique(['flow_id', 'step_order']);
            // TDD "Indexing Strategy - Table flow_steps":
            //   idx_flowsteps_position — resolve semua flow yang punya
            //   step approver tertentu.
            $table->index('approver_position', 'idx_flowsteps_position');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('flow_steps');
    }
};
