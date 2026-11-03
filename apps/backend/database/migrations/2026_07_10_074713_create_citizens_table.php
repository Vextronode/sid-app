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
        Schema::create('citizens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('village_id')->constrained()->cascadeOnDelete();
            $table->text('nik');
            $table->string('nik_hash')->unique();
            $table->string('name', 100);
            // TTL, alamat, nama orang tua, tanggal kawin/cerai, domisili, dan
            // status kelainan terenkripsi (cast di model Citizen): kolom
            // `text` karena ciphertext jauh lebih panjang dari nilainya dan
            // bukan tanggal/boolean yang sah.
            $table->text('date_of_birth');
            $table->text('place_of_birth')->nullable();
            $table->enum('gender', ['L', 'P']);
            $table->enum('blood_type', ['A', 'B', 'AB', 'O', 'tidak_tahu'])->nullable();
            $table->text('address');
            $table->foreignId('rt_id')->nullable()->constrained('rts')->nullOnDelete();
            $table->foreignId('hamlet_id')->nullable()->constrained()->nullOnDelete();

            // EV5-3-S2: no_kk dipindah ke families.no_kk (EV5-3-S1). FK
            // constraint family_id -> families.id ditambahkan di migration
            // terpisah (2026_09_12_..._add_family_id_foreign_to_citizens_table)
            // karena families dibuat setelah citizens secara kronologis.
            $table->uuid('family_id')->nullable();
            // SHDK resmi Disdukcapil (App\Enums\FamilyRole).
            $table->enum('family_role', ['kepala_keluarga', 'suami', 'istri', 'anak', 'menantu', 'cucu', 'orang_tua', 'mertua', 'famili_lain', 'pembantu', 'lainnya'])->nullable();
            $table->uuid('father_id')->nullable();
            $table->uuid('mother_id')->nullable();
            $table->text('father_name_text')->nullable();
            $table->text('mother_name_text')->nullable();

            $table->enum('marital_status', ['belum_kawin', 'kawin', 'kawin_belum_tercatat', 'cerai_hidup', 'cerai_hidup_belum_tercatat', 'cerai_mati'])->nullable();
            $table->foreignId('occupation_id')->nullable()->constrained('occupations')->restrictOnDelete();
            $table->enum('religion', ['islam', 'kristen', 'katolik', 'hindu', 'buddha', 'konghucu'])->nullable();
            $table->enum('last_education', ['tidak_sekolah', 'sd', 'smp', 'sma', 'diploma', 's1', 's2', 's3'])->nullable();
            $table->enum('domicile_status', ['menetap', 'merantau_dalam_negeri', 'merantau_luar_negeri', 'tki'])->default('menetap');
            $table->text('current_domicile')->nullable();

            $table->enum('residency_type', ['lokal', 'pendatang'])->default('lokal');
            $table->string('origin_region')->nullable();

            // Dokumen & keterangan tambahan untuk F-1.01 (CitizenDocumentRules).
            // Nomor akta, tanggal kawin/cerai, status kelainan, dan jenis
            // cacat terenkripsi. has_disorder tanpa default di database;
            // model mengisi `false` saat menyimpan.
            $table->string('title_front', 30)->nullable();
            $table->string('title_back', 30)->nullable();
            $table->text('birth_certificate_number')->nullable();
            $table->text('marriage_certificate_number')->nullable();
            $table->text('marriage_date')->nullable();
            $table->text('divorce_certificate_number')->nullable();
            $table->text('divorce_date')->nullable();
            $table->text('has_disorder')->nullable();
            $table->text('disability')->nullable();

            $table->enum('data_source', ['manual_input_desa', 'import_excel', 'dukcapil_sync'])->default('manual_input_desa');
            $table->timestamp('last_verified_at')->nullable();
            $table->enum('sync_status', ['synced', 'pending', 'conflict'])->nullable();

            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('citizens', function (Blueprint $table) {
            $table->foreign('father_id')->references('id')->on('citizens')->nullOnDelete();
            $table->foreign('mother_id')->references('id')->on('citizens')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('citizens');
    }
};
