<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Peringatan bencana dari SIGAP (lewat API integrasi), terpisah dari
        // `announcements` (satu pengumuman staf per desa). Isi tidak diubah
        // SID; staf hanya bisa menurunkan dan menampilkan lagi. Dihapus
        // `disaster-alerts:prune` setelah masa simpan.
        Schema::create('disaster_alerts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('village_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('integration_client_id')->constrained('integration_clients')->cascadeOnDelete();
            // ID dari SIGAP; unik per client, bukan global.
            $table->string('external_id', 100);
            $table->string('type', 30);
            $table->string('level', 20);
            // Urutan level (DisasterAlertLevel::rank) untuk ORDER BY.
            $table->unsignedTinyInteger('level_rank');
            $table->string('title', 150);
            $table->text('message')->nullable();
            $table->decimal('magnitude', 3, 1)->nullable();
            $table->decimal('depth_km', 6, 1)->nullable();
            $table->string('location', 150)->nullable();
            $table->string('link_url', 500)->nullable();
            $table->timestamp('occurred_at');
            // `sent_at` versi terakhir yang diterapkan; pembaruan yang tidak
            // lebih baru diabaikan.
            $table->timestamp('sent_at');
            // Sudah memakai default dan batas maksimal masa tayang.
            $table->timestamp('expires_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamp('dismissed_at')->nullable();
            $table->foreignUuid('dismissed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('dismiss_reason')->nullable();
            // Level tertinggi yang sudah dikirim sebagai notifikasi.
            $table->unsignedTinyInteger('notified_level_rank')->nullable();
            // created_at = waktu pertama diterima (`received_at` di API).
            $table->timestamps();

            $table->unique(['integration_client_id', 'external_id'], 'uq_disaster_alerts_client_external');
            $table->index(['village_id', 'expires_at'], 'idx_disaster_alerts_village_expires');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('disaster_alerts');
    }
};
