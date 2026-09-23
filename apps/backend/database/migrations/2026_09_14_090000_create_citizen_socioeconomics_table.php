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
        Schema::create('citizen_socioeconomics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('citizen_id')->unique()->constrained()->cascadeOnDelete();
            $table->enum('income_range', ['<1jt', '1-3jt', '3-5jt', '5-10jt', '>10jt'])->nullable();
            $table->enum('house_ownership_status', ['milik_sendiri', 'sewa', 'menumpang', 'dinas'])->nullable();
            $table->enum('water_source', ['pdam', 'sumur', 'sungai', 'lainnya'])->nullable();
            $table->enum('electricity_source', ['pln', 'non_pln', 'tidak_ada'])->nullable();
            $table->integer('dependents_count')->nullable();
            $table->json('productive_assets')->nullable();
            $table->timestamp('surveyed_at')->nullable();
            $table->foreignId('surveyed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('citizen_socioeconomics');
    }
};
