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
        Schema::create('letters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('village_id')->constrained('villages')->cascadeOnDelete();
            $table->foreignId('letter_type_id')->constrained('letter_types')->restrictOnDelete();
            $table->foreignUuid('submitted_by')->constrained('users')->restrictOnDelete();
            // NO ACTION: warga/wilayah yang masih dirujuk tidak bisa dihapus.
            // ReferenceRepository menolaknya lebih dulu dengan pesan 409.
            $table->foreignUuid('on_behalf_of')->nullable()->constrained('citizens')->noActionOnDelete();
            $table->foreignUuid('citizen_id')->nullable()->constrained('citizens')->noActionOnDelete();
            // Wilayah pemohon saat mengajukan: riwayat RT/RW/Kadus tetap di
            // wilayah lama walau pemohon kemudian pindah (mis. pisah KK).
            $table->foreignId('rt_id')->nullable()->constrained('rts')->noActionOnDelete();
            $table->foreignId('rw_id')->nullable()->constrained('rws')->noActionOnDelete();
            $table->foreignId('hamlet_id')->nullable()->constrained('hamlets')->noActionOnDelete();
            $table->string('letter_number', 50)->unique()->nullable();
            $table->string('applicant_name', 100);
            $table->text('applicant_nik');
            $table->string('applicant_nik_hash', 64)->index();
            $table->text('applicant_address')->nullable();
            $table->text('purpose')->nullable();
            // Isian form terenkripsi (cast `encrypted:array`): `text`, karena
            // kolom json PostgreSQL menolak ciphertext yang bukan JSON.
            $table->text('payload')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', [
                'pending',
                'in_progress',
                'approved',
                'rejected',
            ])->default('pending');
            $table->foreignId('flow_id')->constrained('approval_flows')->restrictOnDelete();
            $table->integer('current_step_order')->default(1);
            $table->integer('rejected_at_step')->nullable();
            $table->boolean('is_overdue')->default(false);
            $table->timestamp('expires_at')->nullable();
            // Titik pengingat masa berlaku terakhir yang sudah diproses
            // (30/14/7/3/1, atau 0 untuk hari H). Null: belum ada.
            $table->unsignedSmallInteger('expiry_notified_days')->nullable();
            $table->timestamp('submitted_at')->useCurrent();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['flow_id', 'current_step_order'], 'idx_letters_flow_step');
            $table->index(['village_id', 'status'], 'idx_letters_village_status');
            $table->index('status', 'idx_letters_status');
            $table->index(['status', 'expires_at'], 'idx_letters_status_expires');
            $table->index('is_overdue', 'idx_letters_overdue');
            $table->index('rt_id', 'idx_letters_rt');
            $table->index('rw_id', 'idx_letters_rw');
            $table->index('hamlet_id', 'idx_letters_hamlet');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('letters');
    }
};
