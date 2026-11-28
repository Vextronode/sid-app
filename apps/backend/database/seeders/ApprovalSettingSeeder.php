<?php

namespace Database\Seeders;

use App\Enums\ApprovalLevel;
use App\Models\ApprovalSetting;
use App\Models\Village;
use Illuminate\Database\Seeder;

class ApprovalSettingSeeder extends Seeder
{
    /**
     * Setiap desa mendapat setting untuk dua tahap approval aktif. Tidak ada endpoint POST di api_spec - baris ini murni
     * di-seed sekali saat instalasi, hanya deadline_hours/reminder_hours
     * yang bisa diubah lewat PATCH /approval-settings/{id}. Baris yang sudah
     * ada tidak ditimpa, jadi sid:sync-reference-data hanya menambah tahap
     * yang belum punya setting.
     */
    public function run(): void
    {
        $defaults = [
            ApprovalLevel::RT->value => ['deadline_hours' => 24, 'reminder_hours' => 12],
            ApprovalLevel::KEPALA_DESA->value => ['deadline_hours' => 24, 'reminder_hours' => 12],
        ];

        foreach (Village::query()->pluck('id') as $villageId) {
            foreach ($defaults as $level => $hours) {
                ApprovalSetting::query()->firstOrCreate(
                    ['village_id' => $villageId, 'approval_level' => $level],
                    [...$hours, 'is_active' => true],
                );
            }
        }
    }
}
