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
            $table->id();
            $table->foreignId('village_id')->constrained('villages')->cascadeOnDelete();
            $table->foreignId('letter_type_id')->constrained('letter_types')->restrictOnDelete();
            $table->foreignId('submitted_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('on_behalf_of')->nullable()->constrained('citizens')->nullOnDelete();
            $table->foreignId('citizen_id')->nullable()->constrained('citizens')->nullOnDelete();
            $table->string('letter_number', 50)->unique()->nullable();
            $table->string('applicant_name', 100);
            $table->text('applicant_nik');
            $table->string('applicant_nik_hash', 64)->index();
            $table->text('applicant_address')->nullable();
            $table->text('purpose');
            $table->text('notes')->nullable();
            $table->enum('status', [
                'draft',
                'waiting_rt', 'rt_rejected',
                'waiting_rw', 'rw_rejected',
                'waiting_verification', 'waiting_revision_warga',
                'rejected_revision', 'completed', 'cancelled',
                'pending',
                'rt_approved', 'rw_approved',
                'kadus_approved', 'kadus_rejected',
                'kasi_approved', 'kasi_rejected',
            ])->default('draft');
            $table->boolean('is_overdue')->default(false);
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('submitted_at')->useCurrent();
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('completed_at')->nullable()->after('status');
            $table->timestamps();
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
