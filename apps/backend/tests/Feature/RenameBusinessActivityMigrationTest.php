<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Migration rename `jenis_usaha` -> `kegiatan_usaha` pada SKU (A01) yang
 * belum punya snapshot.
 */
class RenameBusinessActivityMigrationTest extends TestCase
{
    use RefreshDatabase;

    private const MIGRATION = 'database/migrations/2026_11_12_090000_rename_business_activity_in_pending_business_letters.php';

    public function test_only_business_letters_without_a_snapshot_are_renamed_and_rollback_restores_them(): void
    {
        $business = LetterType::factory()->create(['code' => 'A01']);
        $income = LetterType::factory()->create(['code' => 'A03']);

        $pending = Letter::factory()->create(['letter_type_id' => $business->id, 'payload' => ['jenis_usaha' => 'Warung kopi']]);
        // Sudah terbit: template lama ikut dibekukan di snapshot.
        $issued = Letter::factory()->create([
            'letter_type_id' => $business->id,
            'status' => 'approved',
            'payload' => ['jenis_usaha' => 'Bengkel'],
            'snapshot' => ['template' => '{{ jenis_usaha }}'],
        ]);
        // A03 memakai `jenis_usaha` untuk bidang usaha, bukan isian yang diganti.
        $other = Letter::factory()->create(['letter_type_id' => $income->id, 'payload' => ['jenis_usaha' => '4']]);

        $migration = require base_path(self::MIGRATION);
        $migration->up();

        $this->assertSame(['kegiatan_usaha' => 'Warung kopi'], $pending->fresh()->payload);
        $this->assertSame(['jenis_usaha' => 'Bengkel'], $issued->fresh()->payload);
        $this->assertSame(['jenis_usaha' => '4'], $other->fresh()->payload);

        $migration->down();

        $this->assertSame(['jenis_usaha' => 'Warung kopi'], $pending->fresh()->payload);
    }
}
