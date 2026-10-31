<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Lupa kata sandi tanpa email: warga mengajukan dengan NIK + tanggal
        // lahir, Staf SIDUTama menyetujui, lalu warga membuat kata sandi baru
        // dari perangkat yang sama. Perangkat dikenali lewat token klaim yang
        // hanya disimpan di browser pengaju (di sini hanya hash-nya).
        Schema::create('password_reset_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('claim_token_hash', 64)->unique();
            $table->string('status', 20)->default('pending');
            $table->string('requester_ip', 45)->nullable();
            $table->foreignUuid('handled_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('handled_at')->nullable();
            $table->text('response_notes')->nullable();
            $table->timestamp('approved_until')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at'], 'idx_password_reset_requests_status');
            $table->index(['user_id', 'status'], 'idx_password_reset_requests_user');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_requests');
    }
};
