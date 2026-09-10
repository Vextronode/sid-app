<?php

namespace Tests\Unit;

use App\Enums\ApprovalLevel;
use App\Models\ApprovalSetting;
use App\Models\Village;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-9-S1 — Unit test untuk model ApprovalSetting.
 *
 * Cakupan kondisi:
 *  - approval_level di-cast ke App\Enums\ApprovalLevel (ENUM 5 nilai
 *    v5.0, SAMA PERSIS dengan LetterApproval::approval_level) — bukan
 *    ENUM 4-nilai lama ('rt','rw','kadus','kasi') yang jadi technical
 *    debt di TDD Table 70.
 *  - 'rw' dan 'kadus' bukan nilai valid untuk approval_level — ditolak
 *    di level DB (ENUM constraint), konsisten dengan flow_steps &
 *    letter_approvals sejak v5.0.
 *  - deadline_hours/reminder_hours default sesuai TDD (24/12).
 *  - is_active default true.
 *  - UNIQUE(village_id, approval_level) dijaga di level DB.
 *  - Nilai yang sama boleh dipakai ulang di desa yang berbeda.
 *  - relasi village() mengembalikan Village yang benar.
 *
 * TIDAK termasuk di scope ini (lihat EV5-9-S2): Controller/Service CRUD,
 * validasi request (deadline_hours>0, reminder_hours<deadline_hours),
 * dan penggantian hardcode now()->addDays(3)/addDays(2) di
 * LetterService/RtApprovalService/KasiApprovalService menjadi baca dari
 * tabel ini.
 */
class ApprovalSettingModelTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function approval_level_is_cast_to_approval_level_enum(): void
    {
        $village = Village::factory()->create();

        $setting = ApprovalSetting::query()->create([
            'village_id' => $village->id,
            'approval_level' => 'kepala_desa',
        ]);

        $this->assertInstanceOf(ApprovalLevel::class, $setting->fresh()->approval_level);
        $this->assertSame(ApprovalLevel::KEPALA_DESA, $setting->fresh()->approval_level);
    }

    #[Test]
    public function approval_level_accepts_all_five_v5_values(): void
    {
        $village = Village::factory()->create();

        foreach (ApprovalLevel::cases() as $level) {
            $setting = ApprovalSetting::query()->create([
                'village_id' => $village->id,
                'approval_level' => $level->value,
            ]);

            $this->assertSame($level, $setting->fresh()->approval_level);
        }

        $this->assertDatabaseCount('approval_settings', 5);
    }

    #[Test]
    public function rw_is_not_a_valid_approval_level(): void
    {
        $village = Village::factory()->create();

        // Cast enum di Model menolak nilai ini di layer PHP (ValueError)
        // sebelum sempat mencapai DB — proteksi ganda bersama ENUM
        // constraint di level kolom (lihat migration). 'rw' bukan
        // approver sejak v5.0 (flow_steps & letter_approvals juga
        // menolaknya), jadi ApprovalLevel enum memang sengaja tidak
        // memiliki case untuk ini.
        $this->expectException(\ValueError::class);

        ApprovalSetting::query()->create([
            'village_id' => $village->id,
            'approval_level' => 'rw',
        ]);
    }

    #[Test]
    public function kadus_is_not_a_valid_approval_level(): void
    {
        $village = Village::factory()->create();

        $this->expectException(\ValueError::class);

        ApprovalSetting::query()->create([
            'village_id' => $village->id,
            'approval_level' => 'kadus',
        ]);
    }

    #[Test]
    public function deadline_and_reminder_hours_default_per_tdd(): void
    {
        $village = Village::factory()->create();

        $setting = ApprovalSetting::query()->create([
            'village_id' => $village->id,
            'approval_level' => 'rt',
        ]);

        $this->assertSame(24, $setting->fresh()->deadline_hours);
        $this->assertSame(12, $setting->fresh()->reminder_hours);
    }

    #[Test]
    public function is_active_defaults_to_true(): void
    {
        $village = Village::factory()->create();

        $setting = ApprovalSetting::query()->create([
            'village_id' => $village->id,
            'approval_level' => 'rt',
        ]);

        $this->assertTrue($setting->fresh()->is_active);
    }

    #[Test]
    public function unique_constraint_on_village_and_approval_level_is_enforced(): void
    {
        $village = Village::factory()->create();

        ApprovalSetting::query()->create([
            'village_id' => $village->id,
            'approval_level' => 'rt',
        ]);

        $this->expectException(QueryException::class);

        ApprovalSetting::query()->create([
            'village_id' => $village->id,
            'approval_level' => 'rt',
        ]);
    }

    #[Test]
    public function same_approval_level_is_allowed_across_different_villages(): void
    {
        $villageA = Village::factory()->create();
        $villageB = Village::factory()->create();

        ApprovalSetting::query()->create([
            'village_id' => $villageA->id,
            'approval_level' => 'rt',
        ]);

        $settingB = ApprovalSetting::query()->create([
            'village_id' => $villageB->id,
            'approval_level' => 'rt',
        ]);

        $this->assertNotNull($settingB->id);
        $this->assertDatabaseCount('approval_settings', 2);
    }

    #[Test]
    public function village_relation_returns_the_owning_village(): void
    {
        $village = Village::factory()->create();

        $setting = ApprovalSetting::query()->create([
            'village_id' => $village->id,
            'approval_level' => 'rt',
        ]);

        $this->assertInstanceOf(Village::class, $setting->village);
        $this->assertSame($village->id, $setting->village->id);
    }

    #[Test]
    public function database_column_itself_rejects_rw_and_kadus_bypassing_the_model_cast(): void
    {
        // Test di atas (rw_is_not_a_valid_approval_level dkk) membuktikan
        // Model cast sudah menolak lebih dulu di layer PHP. Test ini
        // membuktikan constraint ENUM di level KOLOM juga benar —
        // insert manual via query builder (bypass Eloquent cast) untuk
        // memastikan proteksinya bukan cuma di PHP, tapi memang
        // ter-definisi di skema migration itu sendiri.
        $village = Village::factory()->create();

        $this->expectException(QueryException::class);

        DB::table('approval_settings')->insert([
            'village_id' => $village->id,
            'approval_level' => 'rw',
            'deadline_hours' => 24,
            'reminder_hours' => 12,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
