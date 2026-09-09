<?php

namespace Tests\Unit;

use App\Models\ApprovalFlow;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\User;
use App\Models\Village;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LettersMigrationTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function old_columns_are_completely_removed(): void
    {
        $this->assertFalse(
            Schema::hasColumn('letters', 'revision_count'),
            'revision_count harus sudah dihapus total — fitur revisi surat tidak tercatat di TDD manapun (keputusan EV5-0-S1).'
        );
    }

    #[Test]
    public function new_v5_columns_exist(): void
    {
        $this->assertTrue(Schema::hasColumns('letters', [
            'flow_id',
            'current_step_order',
            'rejected_at_step',
        ]));
    }

    #[Test]
    public function preserved_columns_still_exist(): void
    {
        $this->assertTrue(Schema::hasColumns('letters', [
            'applicant_nik',
            'applicant_nik_hash',
            'applicant_address',
            'payload',
            'is_overdue',
            'expires_at',
            'submitted_at',
            'processed_at',
        ]));
    }

    #[Test]
    public function payload_column_accepts_json_and_round_trips_as_array(): void
    {
        $letter = Letter::factory()->create([
            'payload' => ['keperluan_tambahan' => 'lampiran KTP', 'jumlah_lembar' => 2],
        ]);

        $fresh = Letter::query()->find($letter->id);

        $this->assertIsArray($fresh->payload);
        $this->assertSame('lampiran KTP', $fresh->payload['keperluan_tambahan']);
        $this->assertSame(2, $fresh->payload['jumlah_lembar']);
    }

    #[Test]
    public function payload_is_nullable(): void
    {
        $letter = Letter::factory()->create(['payload' => null]);

        $this->assertNull($letter->fresh()->payload);
    }

    #[Test]
    public function status_defaults_to_pending(): void
    {
        $flow = ApprovalFlow::factory()->create();

        $id = DB::table('letters')->insertGetId($this->minimalLetterRow($flow->id));

        $row = DB::table('letters')->find($id);

        $this->assertSame('pending', $row->status);
    }

    #[DataProvider('validStatuses')]
    #[Test]
    public function status_accepts_all_four_generic_values(string $status): void
    {
        $flow = ApprovalFlow::factory()->create();

        $id = DB::table('letters')->insertGetId(array_merge(
            $this->minimalLetterRow($flow->id),
            ['status' => $status],
        ));

        $this->assertDatabaseHas('letters', ['id' => $id, 'status' => $status]);
    }

    public static function validStatuses(): array
    {
        return [
            'pending' => ['pending'],
            'in_progress' => ['in_progress'],
            'approved' => ['approved'],
            'rejected' => ['rejected'],
        ];
    }

    #[DataProvider('legacyGranularStatuses')]
    #[Test]
    public function status_rejects_legacy_granular_values(string $legacyStatus): void
    {
        $flow = ApprovalFlow::factory()->create();

        $this->expectException(QueryException::class);

        DB::table('letters')->insert(array_merge(
            $this->minimalLetterRow($flow->id),
            ['status' => $legacyStatus],
        ));
    }

    public static function legacyGranularStatuses(): array
    {
        return [
            'draft (generasi pertama)' => ['draft'],
            'waiting_rt (generasi pertama)' => ['waiting_rt'],
            'waiting_verification (generasi pertama)' => ['waiting_verification'],
            'cancelled (generasi pertama)' => ['cancelled'],
            'rt_approved (v4.2 granular)' => ['rt_approved'],
            'rw_approved (v4.2 granular)' => ['rw_approved'],
            'kadus_approved (v4.2 granular)' => ['kadus_approved'],
            'kasi_approved (v4.2 granular)' => ['kasi_approved'],
            'waiting_revision_warga (fitur revisi, dihapus EV5-0-S1)' => ['waiting_revision_warga'],
        ];
    }

    #[Test]
    public function current_step_order_defaults_to_one(): void
    {
        $flow = ApprovalFlow::factory()->create();

        $id = DB::table('letters')->insertGetId($this->minimalLetterRow($flow->id));

        $this->assertSame(1, DB::table('letters')->find($id)->current_step_order);
    }

    #[Test]
    public function rejected_at_step_is_nullable(): void
    {
        $letter = Letter::factory()->create(['rejected_at_step' => null]);

        $this->assertNull($letter->fresh()->rejected_at_step);
    }

    #[Test]
    public function rejected_at_step_can_be_set_when_letter_is_rejected(): void
    {
        $flow = ApprovalFlow::factory()->create();

        $id = DB::table('letters')->insertGetId(array_merge(
            $this->minimalLetterRow($flow->id),
            ['status' => 'rejected', 'rejected_at_step' => 2],
        ));

        $row = DB::table('letters')->find($id);

        $this->assertSame('rejected', $row->status);
        $this->assertSame(2, $row->rejected_at_step);
    }

    #[Test]
    public function flow_id_is_not_nullable(): void
    {
        $this->expectException(QueryException::class);

        DB::table('letters')->insert(
            array_merge($this->minimalLetterRow(null), []),
        );
    }

    #[Test]
    public function flow_id_foreign_key_rejects_nonexistent_flow(): void
    {
        $this->expectException(QueryException::class);

        DB::table('letters')->insert($this->minimalLetterRow(999999));
    }

    #[Test]
    public function flow_id_is_a_snapshot_independent_from_letter_type_flow_id(): void
    {
        // Simulasikan: letter_type sudah pindah ke flow lain SETELAH surat
        // disubmit — surat yang sudah berjalan tidak boleh ikut berubah
        // flow_id-nya (snapshot, dikunci — SID-ARCH-BE-001 S3.2).
        $originalFlow = ApprovalFlow::factory()->create();
        $newFlow = ApprovalFlow::factory()->create();

        $letterType = LetterType::factory()->create(['flow_id' => $originalFlow->id]);
        $letter = Letter::factory()->create([
            'letter_type_id' => $letterType->id,
            'flow_id' => $originalFlow->id,
        ]);

        // Admin ubah konfigurasi flow default tipe surat ini.
        $letterType->update(['flow_id' => $newFlow->id]);

        $this->assertSame(
            $originalFlow->id,
            $letter->fresh()->flow_id,
            'letters.flow_id harus tetap mengacu flow lama meski letter_types.flow_id sudah berubah — snapshot, bukan live-reference.'
        );
    }

    #[Test]
    public function flow_relation_resolves_to_correct_approval_flow(): void
    {
        $flow = ApprovalFlow::factory()->create();
        $letter = Letter::factory()->create(['flow_id' => $flow->id]);

        $this->assertInstanceOf(ApprovalFlow::class, $letter->flow);
        $this->assertSame($flow->id, $letter->flow->id);
    }

    #[Test]
    public function current_step_order_and_flow_id_index_supports_generic_dashboard_query(): void
    {
        $flow = ApprovalFlow::factory()->create();

        $matchingId = DB::table('letters')->insertGetId(array_merge(
            $this->minimalLetterRow($flow->id),
            ['current_step_order' => 2, 'status' => 'in_progress'],
        ));
        DB::table('letters')->insertGetId(array_merge(
            $this->minimalLetterRow($flow->id),
            ['current_step_order' => 1, 'status' => 'pending'],
        ));

        $result = DB::table('letters')
            ->where('flow_id', $flow->id)
            ->where('current_step_order', 2)
            ->whereIn('status', ['pending', 'in_progress'])
            ->get();

        $this->assertCount(1, $result);
        $this->assertSame($matchingId, $result->first()->id);
    }

    private function minimalLetterRow(?int $flowId): array
    {
        $letterType = LetterType::factory()->create();

        return [
            'village_id' => Village::factory()->create()->id,
            'letter_type_id' => $letterType->id,
            'submitted_by' => User::factory()->create()->id,
            'applicant_name' => 'Test Applicant',
            'applicant_nik' => encrypt('3201012345670001'),
            'applicant_nik_hash' => hash('sha256', '3201012345670001'),
            'purpose' => 'Keperluan pengujian',
            'flow_id' => $flowId,
            'submitted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
