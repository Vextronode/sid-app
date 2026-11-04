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
        Schema::create('village_org_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('position_id')->constrained('village_org_positions')->cascadeOnDelete();
            // Warga desa pemegang jabatan (dipilih lewat NIK). member_name
            // adalah salinan nama saat ditetapkan, supaya riwayat tetap
            // terbaca walau data warga berubah atau dihapus. Baris tidak
            // pernah dihapus: berakhirnya jabatan dicatat lewat ended_at.
            $table->foreignUuid('citizen_id')->nullable()->constrained('citizens')->nullOnDelete();
            $table->string('member_name', 150);
            $table->string('photo_img')->nullable();
            $table->string('phone_wa', 20)->nullable();
            $table->date('started_at');
            $table->date('ended_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('village_org_members');
    }
};
