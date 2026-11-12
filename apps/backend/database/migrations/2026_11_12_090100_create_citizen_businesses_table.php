<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Data usaha warga, dicatat sekali saat Surat Keterangan Usaha (A01)
        // terbit dan tidak diubah sesudahnya. `id` menjadi `business_ref` di
        // API integrasi Cimart. Status berlaku dihitung dari
        // letters.expires_at, bukan disimpan di sini.
        Schema::create('citizen_businesses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('village_id')->constrained()->cascadeOnDelete();
            // Satu warga boleh punya beberapa usaha (beberapa SKU).
            $table->foreignUuid('citizen_id')->nullable()->constrained('citizens')->nullOnDelete();
            $table->foreignUuid('letter_id')->unique()->constrained('letters')->cascadeOnDelete();
            $table->string('business_name');
            $table->string('business_activity');
            $table->string('category', 30);
            // Terenkripsi, jadi `text`.
            $table->text('email');
            $table->text('phone');
            $table->text('address');

            // Pendaftaran pedagang Cimart: NULL (tidak mendaftar), pending,
            // accepted, rejected, atau cancelled.
            $table->string('cimart_status', 20)->nullable();
            $table->timestamp('cimart_requested_at')->nullable();
            $table->timestamp('cimart_decided_at')->nullable();
            // Alasan penolakan dari Cimart, ditampilkan ke warga.
            $table->text('cimart_note')->nullable();
            $table->timestamp('cimart_cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['village_id', 'category'], 'idx_citizen_businesses_village_category');
            $table->index(['cimart_status', 'cimart_requested_at'], 'idx_citizen_businesses_cimart_queue');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('citizen_businesses');
    }
};
