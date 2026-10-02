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
        Schema::create('officials', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('citizen_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('position', [
                'kepala_desa',
                'rt',
                'rw',
                'kadus',
                'kasi_pelayanan',
                'kaur_tu_umum',
                'petugas_desa',
                'sekdes',
                'kasi_kesejahteraan',
                'kasi_pemerintahan',
                'kaur_perencanaan',
                'kaur_keuangan',
                'staf_sipades',
                'staf_siskeudes',
            ]);
            $table->foreignUuid('village_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('rt_id')->nullable()->constrained('rts')->nullOnDelete();
            $table->foreignId('rw_id')->nullable()->constrained('rws')->nullOnDelete();
            $table->foreignId('hamlet_id')->nullable()->constrained()->nullOnDelete();
            $table->string('signature_img')->nullable();
            $table->string('stamp_img')->nullable();
            $table->string('photo_img')->nullable();
            $table->string('phone_wa')->nullable();
            $table->date('started_at');
            $table->date('ended_at')->nullable();
            $table->date('term_ends_at')->nullable()->after('ended_at');
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['is_active', 'term_ends_at'], 'idx_officials_term');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('officials');
    }
};
