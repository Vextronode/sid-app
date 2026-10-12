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
        Schema::create('villages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 100);
            $table->string('code', 20)->unique();
            $table->string('head_name', 100)->nullable();
            $table->string('address')->nullable();
            $table->string('phone', 20)->nullable();
            // Luas wilayah dalam hektare, diisi Petugas Desa.
            $table->decimal('area_ha', 10, 3)->nullable();
            $table->string('stamp_img')->nullable();
            // Tampilan halaman publik, diubah Petugas Desa. Gambar berisi path
            // aset frontend (/assets/..., dari seeder) atau path unggahan di
            // disk public.
            $table->string('logo')->nullable();
            $table->string('hero_image')->nullable();
            $table->string('hero_photo_credit', 100)->nullable();
            $table->string('office_hours', 100)->nullable();
            $table->string('map_url', 500)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('villages');
    }
};
