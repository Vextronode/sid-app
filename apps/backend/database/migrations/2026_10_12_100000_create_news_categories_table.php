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
        Schema::create('news_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('village_id')->constrained()->cascadeOnDelete();
            $table->string('name', 50);
            $table->string('slug', 60);
            $table->timestamps();
            $table->unique(['village_id', 'slug']);
        });

        // Satu berita punya 1-2 kategori (dijaga di request). Kategori yang
        // pernah dipakai tidak bisa dihapus, termasuk oleh berita soft-deleted.
        Schema::create('news_category_news', function (Blueprint $table) {
            $table->foreignId('news_id')->constrained('news')->cascadeOnDelete();
            $table->foreignId('news_category_id')->constrained('news_categories')->restrictOnDelete();
            $table->primary(['news_id', 'news_category_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('news_category_news');
        Schema::dropIfExists('news_categories');
    }
};
