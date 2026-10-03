<?php

namespace Database\Seeders;

use App\Enums\ApprovalLevel;
use App\Models\ApprovalSetting;
use App\Models\Village;
use Illuminate\Database\Seeder;

class ApprovalSettingSeeder extends Seeder
{
    /**
     * Setiap desa mendapat setting untuk tiga level approver aktif. Tidak ada endpoint POST di api_spec - baris ini murni
     * di-seed sekali saat instalasi, hanya deadline_hours/reminder_hours
     * yang bisa diubah lewat PATCH /approval-settings/{id}.
     */
    public function run(): void
    {
        $village = Village::first();

        if (! $village) {
            return;
        }

        $defaults = [
            ApprovalLevel::RT->value => ['deadline_hours' => 24, 'reminder_hours' => 12],
            ApprovalLevel::KEPALA_DESA->value => ['deadline_hours' => 24, 'reminder_hours' => 12],
            ApprovalLevel::SEKDES->value => ['deadline_hours' => 24, 'reminder_hours' => 12],
        ];

        foreach ($defaults as $level => $hours) {
            ApprovalSetting::updateOrCreate(
                ['village_id' => $village->id, 'approval_level' => $level],
                [...$hours, 'is_active' => true],
            );
        }
    }
}
