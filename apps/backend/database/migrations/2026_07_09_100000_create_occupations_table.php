<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('occupations', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('village_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        DB::statement('CREATE UNIQUE INDEX occupations_village_name_ci_unique ON occupations (village_id, LOWER(name))');
    }

    public function down(): void
    {
        Schema::dropIfExists('occupations');
    }
};
