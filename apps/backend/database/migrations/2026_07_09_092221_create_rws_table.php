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
        Schema::create('rws', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hamlet_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('village_id')->constrained()->cascadeOnDelete();
            $table->string('number');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index('village_id', 'idx_rws_village');
            // Nomor RW urut se-desa, tidak mulai lagi di tiap dusun (data
            // desa dan impor Excel memakai aturan ini). Nomor selalu tiga
            // digit (App\Support\AreaNumber), jadi "1" tidak bisa jadi
            // duplikat "001".
            $table->unique(['village_id', 'number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rws');
    }
};
