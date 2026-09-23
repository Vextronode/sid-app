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
            $table->json('payload')->nullable();
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
            $table->timestamp('submitted_at')->useCurrent();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['flow_id', 'current_step_order'], 'idx_letters_flow_step');
            $table->index(['village_id', 'status'], 'idx_letters_village_status');
            $table->index('status', 'idx_letters_status');
            $table->index('is_overdue', 'idx_letters_overdue');
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
