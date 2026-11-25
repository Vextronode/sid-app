<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Repositories\ReferenceRepository;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Warga dan wilayah yang masih dirujuk tidak boleh terhapus (Batch hapus
 * aman): database menolaknya lewat foreign key ON DELETE NO ACTION, dan
 * ReferenceRepository menolak lebih dulu dengan pesan 409.
 */
class ReferenceGuardTest extends TestCase
{
    use RefreshDatabase;

    private const REGION_TABLES = ['hamlets', 'rws', 'rts'];

    public function test_every_locking_foreign_key_is_checked_before_delete(): void
    {
        $locking = ['citizens' => [], 'regions' => []];

        foreach (Schema::getTables() as $table) {
            foreach (Schema::getForeignKeys($table['name']) as $foreignKey) {
                $target = $foreignKey['foreign_table'] === 'citizens' ? 'citizens'
                    : (in_array($foreignKey['foreign_table'], self::REGION_TABLES, true) ? 'regions' : null);

                if ($target === null || ! in_array(strtolower((string) $foreignKey['on_delete']), ['no action', 'restrict'], true)) {
                    continue;
                }

                foreach ($foreignKey['columns'] as $column) {
                    $locking[$target][] = $table['name'].'.'.$column;
                }
            }
        }

        $checked = fn (array $references): array => collect($references)
            ->flatMap(fn (array $reference) => array_map(fn (string $column) => $reference[0].'.'.$column, $reference[1]))
            ->sort()->values()->all();

        // Foreign key baru yang mengunci hapus warga/wilayah harus ikut dicek
        // ReferenceRepository; tanpa itu hapus berakhir 500, bukan 409.
        $this->assertSame($checked(ReferenceRepository::CITIZEN_REFERENCES), collect($locking['citizens'])->sort()->values()->all());
        $this->assertSame($checked(ReferenceRepository::REGION_REFERENCES), collect($locking['regions'])->sort()->values()->all());
    }

    public function test_database_refuses_deleting_a_referenced_citizen_or_region(): void
    {
        $hamlet = Hamlet::factory()->create();
        $rw = Rw::factory()->create(['hamlet_id' => $hamlet->id]);
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['village_id' => $hamlet->village_id]);
        // Jabatan lama (tidak aktif) tetap riwayat: dulu ikut terhapus
        // bersama warganya (cascade) atau kehilangan RT-nya (set null).
        Official::factory()->create([
            'citizen_id' => $citizen->id,
            'village_id' => $hamlet->village_id,
            'position' => 'rt',
            'rt_id' => $rt->id,
            'is_active' => false,
        ]);

        foreach ([$citizen, $rt, $rw, $hamlet] as $model) {
            try {
                // Savepoint: kegagalan tidak membatalkan transaksi test (PostgreSQL).
                DB::transaction(fn () => $model->delete());
                $this->fail($model::class.' yang masih dirujuk seharusnya ditolak database.');
            } catch (QueryException) {
                $this->assertModelExists($model);
            }
        }

        $this->assertDatabaseHas('officials', ['citizen_id' => $citizen->id, 'rt_id' => $rt->id]);
    }
}
