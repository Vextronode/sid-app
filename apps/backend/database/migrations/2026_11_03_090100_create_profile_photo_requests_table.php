<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // D1/K4. Permintaan warga mengganti foto profil akunnya, diputuskan
        // petugas wilayah dengan jenjang yang sama seperti aktivasi akun:
        // RT, lalu RW, Kepala Dusun, atau Staf SIDUTama. Satu baris per
        // permintaan, sekaligus riwayatnya.
        Schema::create('profile_photo_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('village_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('citizen_id')->nullable()->constrained('citizens')->nullOnDelete();
            // Wilayah warga saat meminta: dasar routing dan riwayat per jenjang.
            $table->foreignId('rt_id')->nullable()->constrained('rts')->nullOnDelete();
            $table->foreignId('rw_id')->nullable()->constrained('rws')->nullOnDelete();
            $table->foreignId('hamlet_id')->nullable()->constrained('hamlets')->nullOnDelete();
            $table->string('status', 20)->default('pending');
            // Foto dari kamera (disk privat); dipindah menjadi foto profil
            // begitu disetujui.
            $table->string('photo_path')->nullable();
            $table->foreignUuid('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('decided_level', 20)->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->text('decision_notes')->nullable();
            $table->timestamps();

            $table->index(['village_id', 'status'], 'idx_profile_photo_requests_village_status');
            $table->index(['user_id', 'status'], 'idx_profile_photo_requests_user_status');
        });

        // Satu permintaan menunggu per akun, juga untuk dua kiriman bersamaan.
        DB::statement(
            'CREATE UNIQUE INDEX profile_photo_requests_single_pending_unique ON profile_photo_requests (user_id) '
            ."WHERE status = 'pending'"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_photo_requests');
    }
};
