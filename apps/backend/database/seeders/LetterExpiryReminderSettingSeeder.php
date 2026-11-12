<?php

namespace Database\Seeders;

use App\Models\LetterExpiryReminderSetting;
use App\Models\Village;
use Illuminate\Database\Seeder;

class LetterExpiryReminderSettingSeeder extends Seeder
{
    /**
     * Setiap desa mendapat lima titik pengingat masa berlaku surat, semuanya
     * aktif. Tidak ada endpoint untuk menambah titik; Staf SIDUTama hanya
     * bisa menyalakan atau mematikannya.
     */
    public function run(): void
    {
        $now = now();

        foreach (Village::query()->pluck('id') as $villageId) {
            foreach (LetterExpiryReminderSetting::DAYS_BEFORE_OPTIONS as $daysBefore) {
                LetterExpiryReminderSetting::query()->firstOrCreate(
                    ['village_id' => $villageId, 'days_before' => $daysBefore],
                    ['is_active' => true, 'activated_at' => $now],
                );
            }
        }
    }
}
