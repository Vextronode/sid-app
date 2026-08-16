<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add revision_count to letters
        Schema::table('letters', function (Blueprint $table) {
            $table->unsignedTinyInteger('revision_count')->default(0)->after('status');
        });

        // 2. Update letter_status_logs enum to include revision statuses
        DB::statement("ALTER TABLE letter_status_logs MODIFY COLUMN old_status ENUM(
            'pending',
            'rt_approved', 'rt_rejected',
            'rw_approved', 'rw_rejected',
            'kadus_approved', 'kadus_rejected',
            'kasi_approved', 'kasi_rejected',
            'waiting_revision_warga', 'rejected_revision'
        ) NULL");

        DB::statement("ALTER TABLE letter_status_logs MODIFY COLUMN new_status ENUM(
            'pending',
            'rt_approved', 'rt_rejected',
            'rw_approved', 'rw_rejected',
            'kadus_approved', 'kadus_rejected',
            'kasi_approved', 'kasi_rejected',
            'waiting_revision_warga', 'rejected_revision'
        ) NOT NULL");
    }

    public function down(): void
    {
        Schema::table('letters', function (Blueprint $table) {
            $table->dropColumn('revision_count');
        });

        DB::statement("ALTER TABLE letter_status_logs MODIFY COLUMN old_status ENUM(
            'pending',
            'rt_approved', 'rt_rejected',
            'rw_approved', 'rw_rejected',
            'kadus_approved', 'kadus_rejected',
            'kasi_approved', 'kasi_rejected'
        ) NULL");

        DB::statement("ALTER TABLE letter_status_logs MODIFY COLUMN new_status ENUM(
            'pending',
            'rt_approved', 'rt_rejected',
            'rw_approved', 'rw_rejected',
            'kadus_approved', 'kadus_rejected',
            'kasi_approved', 'kasi_rejected'
        ) NOT NULL");
    }
};
