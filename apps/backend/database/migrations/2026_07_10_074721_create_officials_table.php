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
            // Nilai App\Enums\OfficialPosition (jabatan berakun) atau `code`
            // dari official_position_types (jabatan tanpa akun).
            $table->string('position', 50);
            $table->foreignUuid('village_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('rt_id')->nullable()->constrained('rts')->nullOnDelete();
            $table->foreignId('rw_id')->nullable()->constrained('rws')->nullOnDelete();
            $table->foreignId('hamlet_id')->nullable()->constrained()->nullOnDelete();
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
