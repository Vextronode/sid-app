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
        Schema::create('letter_categories', function (Blueprint $table) {
            $table->id();
            $table->enum('code', [
                'approval_normal',
                'upload_mandiri',
                'dokumen_pendukung',
                'update_data',
            ])->unique();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->string('handler_class', 150);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('letter_categories');
    }
};
