<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Isian halaman informasi publik (PPID, Kebijakan Privasi,
     * Aksesibilitas). Teks bakunya ada di frontend; yang disimpan hanya
     * bagian khas desa. Daftar field per halaman: App\Support\InfoPageFields.
     */
    public function up(): void
    {
        Schema::create('village_info_pages', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('village_id')->constrained()->cascadeOnDelete();
            $table->string('page', 30);
            $table->json('fields');
            $table->timestamps();

            $table->unique(['village_id', 'page']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('village_info_pages');
    }
};
