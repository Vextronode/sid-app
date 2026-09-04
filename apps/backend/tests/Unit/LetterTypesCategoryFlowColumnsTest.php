<?php

namespace Tests\Unit;

use App\Models\ApprovalFlow;
use App\Models\LetterCategory;
use App\Models\LetterType;
use Database\Seeders\ApprovalFlowSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LetterTypesCategoryFlowColumnsTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function category_id_and_flow_id_columns_exist_and_are_not_nullable(): void
    {
        $this->assertTrue(Schema::hasColumns('letter_types', ['category_id', 'flow_id']));

        // Insert tanpa category_id/flow_id harus gagal karena NOT NULL.
        // requirement_info WAJIB disertakan (NOT NULL, tanpa default) agar
        // exception yang tertangkap benar-benar berasal dari
        // category_id/flow_id yang hilang, bukan dari kolom lain.
        $this->expectException(QueryException::class);

        DB::table('letter_types')->insert([
            'code' => 'SKD',
            'name' => 'Surat Keterangan Domisili',
            'verification_type' => 'auto',
            'requirement_info' => 'KTP, KK.',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    #[Test]
    public function foreign_key_constraint_prevents_invalid_category_id(): void
    {
        $this->seed(ApprovalFlowSeeder::class);
        $flow = ApprovalFlow::query()->first();

        $this->expectException(QueryException::class);

        DB::table('letter_types')->insert([
            'code' => 'SKX',
            'name' => 'Surat Tidak Valid',
            'verification_type' => 'auto',
            'requirement_info' => 'KTP, KK.',
            'category_id' => 99999, // kategori tidak ada
            'flow_id' => $flow->id,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    #[Test]
    public function foreign_key_constraint_prevents_invalid_flow_id(): void
    {
        $this->seed(ApprovalFlowSeeder::class);
        $category = LetterCategory::query()->first();

        $this->expectException(QueryException::class);

        DB::table('letter_types')->insert([
            'code' => 'SKY',
            'name' => 'Surat Tidak Valid 2',
            'verification_type' => 'auto',
            'requirement_info' => 'KTP, KK.',
            'category_id' => $category->id,
            'flow_id' => 99999, // flow tidak ada
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    #[Test]
    public function seeder_does_not_create_duplicate_category_or_flow_when_run_twice(): void
    {
        $this->seed(ApprovalFlowSeeder::class);
        $this->seed(ApprovalFlowSeeder::class);

        $categoryCount = LetterCategory::query()->where('code', 'approval_normal')->count();
        $this->assertSame(1, $categoryCount, 'Seeder harus idempotent, tidak boleh duplikat kategori.');

        $flowCount = ApprovalFlow::query()
            ->where('name', 'RT-Kades-Staff (3 Tahap)')
            ->count();
        $this->assertSame(1, $flowCount, 'Seeder harus idempotent, tidak boleh duplikat flow.');
    }

    #[Test]
    public function seeded_flow_steps_never_contain_sekdes_rw_or_kadus(): void
    {
        $this->seed(ApprovalFlowSeeder::class);

        $category = LetterCategory::query()->where('code', 'approval_normal')->first();
        $flow = ApprovalFlow::query()->where('category_id', $category->id)->first();

        $positions = DB::table('flow_steps')
            ->where('flow_id', $flow->id)
            ->pluck('approver_position')
            ->all();

        $this->assertNotContains('sekdes', $positions);
        $this->assertNotContains('rw', $positions);
        $this->assertNotContains('kadus', $positions);
    }

    #[Test]
    public function letter_type_belongs_to_correct_category_and_flow_relations(): void
    {
        $this->seed(ApprovalFlowSeeder::class);

        $category = LetterCategory::query()->where('code', 'approval_normal')->first();
        $flow = ApprovalFlow::query()->where('category_id', $category->id)->first();

        $letterType = LetterType::query()->create([
            'code' => 'SKTM',
            'name' => 'Surat Keterangan Tidak Mampu',
            'verification_type' => 'manual',
            'requirement_info' => 'KTP, KK.',
            'is_active' => true,
            'category_id' => $category->id,
            'flow_id' => $flow->id,
        ]);

        $this->assertInstanceOf(LetterCategory::class, $letterType->category);
        $this->assertInstanceOf(ApprovalFlow::class, $letterType->flow);
        $this->assertSame('approval_normal', $letterType->category->code);
    }
}
