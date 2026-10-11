<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PostgreSQL tidak membuat index otomatis untuk kolom foreign key.
     * Kolom di bawah dipakai sebagai filter scope wilayah (whereHas),
     * pengurutan daftar, dan eager-load, sehingga tanpa index setiap
     * daftar surat/warga berujung sequential scan.
     *
     * @var array<string, array<string, array<int, string>>>
     */
    private const INDEXES = [
        'citizens' => [
            'idx_citizens_village_active' => ['village_id', 'is_active'],
            'idx_citizens_rt' => ['rt_id'],
            'idx_citizens_hamlet' => ['hamlet_id'],
            'idx_citizens_family' => ['family_id'],
        ],
        'letters' => [
            'idx_letters_submitter_created' => ['submitted_by', 'created_at'],
            'idx_letters_citizen' => ['citizen_id'],
            'idx_letters_type' => ['letter_type_id'],
            'idx_letters_village_submitted' => ['village_id', 'submitted_at'],
            'idx_letters_village_created' => ['village_id', 'created_at'],
        ],
        'letter_approvals' => [
            'idx_approvals_flow_step' => ['flow_step_id'],
        ],
        'rts' => [
            'idx_rts_rw' => ['rw_id'],
        ],
        'rws' => [
            'idx_rws_hamlet' => ['hamlet_id'],
        ],
        'officials' => [
            'idx_officials_user' => ['user_id'],
            'idx_officials_citizen' => ['citizen_id'],
            'idx_officials_village_position' => ['village_id', 'position', 'is_active'],
            'idx_officials_rt' => ['rt_id'],
        ],
        'users' => [
            'idx_users_village' => ['village_id'],
            'idx_users_citizen' => ['citizen_id'],
        ],
        'families' => [
            'idx_families_village' => ['village_id'],
            'idx_families_rt' => ['rt_id'],
        ],
        'news' => [
            'idx_news_village_published' => ['village_id', 'is_published', 'published_at'],
        ],
    ];

    public function up(): void
    {
        foreach (self::INDEXES as $tableName => $indexes) {
            Schema::table($tableName, function (Blueprint $table) use ($indexes) {
                foreach ($indexes as $name => $columns) {
                    $table->index($columns, $name);
                }
            });
        }
    }

    public function down(): void
    {
        foreach (self::INDEXES as $tableName => $indexes) {
            Schema::table($tableName, function (Blueprint $table) use ($indexes) {
                foreach (array_keys($indexes) as $name) {
                    $table->dropIndex($name);
                }
            });
        }
    }
};
