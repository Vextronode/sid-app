<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Aplikasi pihak ketiga yang memanggil API integrasi SID (Cimart,
        // SIGAP). Token-nya personal_access_tokens milik baris ini, jadi `id`
        // wajib UUID mengikuti uuidMorphs('tokenable').
        Schema::create('integration_clients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('village_id')->constrained()->cascadeOnDelete();
            // Kunci untuk command artisan, mis. `cimart`.
            $table->string('slug', 50)->unique();
            $table->string('name', 100);
            // Ability yang diberikan ke setiap token baru client ini. Hanya
            // diubah lewat artisan (integration:abilities).
            $table->json('abilities');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_clients');
    }
};
