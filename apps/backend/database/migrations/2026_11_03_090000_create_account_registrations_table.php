<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // D1/K4. Pendaftaran akun warga menunggu aktivasi petugas wilayah:
        // RT, lalu RW, Kepala Dusun, atau Staf SIDUTama bila jenjang di
        // bawahnya kosong. Satu baris per percobaan pendaftaran, sekaligus
        // riwayatnya. Akun (users) dibuat nonaktif sampai disetujui.
        Schema::create('account_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('village_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('citizen_id')->constrained('citizens')->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            // Wilayah pendaftar saat mendaftar: dasar routing dan riwayat per jenjang.
            $table->foreignId('rt_id')->nullable()->constrained('rts')->nullOnDelete();
            $table->foreignId('rw_id')->nullable()->constrained('rws')->nullOnDelete();
            $table->foreignId('hamlet_id')->nullable()->constrained('hamlets')->nullOnDelete();
            $table->string('status', 20)->default('pending');
            // online (halaman Daftar) atau manual (Staf SIDUTama, NIK yang diblokir).
            $table->string('method', 20)->default('online');
            // Foto dari kamera (disk privat); dihapus begitu disetujui.
            $table->string('photo_path')->nullable();
            $table->foreignUuid('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('decided_level', 20)->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->text('decision_notes')->nullable();
            $table->timestamps();

            $table->index(['village_id', 'status'], 'idx_account_registrations_village_status');
            $table->index(['citizen_id', 'status'], 'idx_account_registrations_citizen_status');
        });

        // Satu pendaftaran menunggu per warga, juga untuk dua kiriman bersamaan.
        DB::statement(
            'CREATE UNIQUE INDEX account_registrations_single_pending_unique ON account_registrations (citizen_id) '
            ."WHERE status = 'pending'"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('account_registrations');
    }
};
