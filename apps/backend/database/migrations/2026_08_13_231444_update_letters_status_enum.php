<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE letters MODIFY COLUMN status ENUM(
            'draft',
            'waiting_rt', 'rt_rejected',
            'waiting_rw', 'rw_rejected',
            'waiting_verification', 'waiting_revision_warga',
            'rejected_revision', 'completed', 'cancelled',
            'pending',
            'rt_approved', 'rw_approved',
            'kadus_approved', 'kadus_rejected',
            'kasi_approved', 'kasi_rejected'
        ) DEFAULT 'draft'");
    }

    public function down(): void
    {
        // Revert to original enum
        DB::statement("ALTER TABLE letters MODIFY COLUMN status ENUM(
            'draft',
            'waiting_rt', 'rt_rejected',
            'waiting_rw', 'rw_rejected',
            'waiting_verification', 'waiting_revision_warga',
            'rejected_revision', 'completed', 'cancelled',
            'pending',
            'rt_approved', 'rw_approved',
            'kadus_approved', 'kadus_rejected',
            'kasi_approved', 'kasi_rejected'
        ) DEFAULT 'draft'");
    }
};
