<?php

namespace App\Repositories;

use App\Models\LetterExpiryReminderSetting;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

class LetterExpiryReminderSettingRepository
{
    /**
     * @return Collection<int, LetterExpiryReminderSetting> dari titik terjauh (H-30)
     */
    public function allForVillage(string $villageId): Collection
    {
        return LetterExpiryReminderSetting::query()
            ->where('village_id', $villageId)
            ->whereIn('days_before', LetterExpiryReminderSetting::DAYS_BEFORE_OPTIONS)
            ->orderByDesc('days_before')
            ->get();
    }

    public function findByIdOrFail(int $id): LetterExpiryReminderSetting
    {
        return LetterExpiryReminderSetting::query()->findOrFail($id);
    }

    public function update(LetterExpiryReminderSetting $setting, array $data): LetterExpiryReminderSetting
    {
        $setting->update($data);

        return $setting;
    }

    /**
     * Titik pengingat yang aktif di sebuah desa.
     *
     * @return array<int, Carbon|null> days_before => activated_at
     */
    public function activePointsForVillage(string $villageId): array
    {
        return LetterExpiryReminderSetting::query()
            ->where('village_id', $villageId)
            ->where('is_active', true)
            ->get(['days_before', 'activated_at'])
            ->mapWithKeys(fn (LetterExpiryReminderSetting $setting) => [
                $setting->days_before => $setting->activated_at,
            ])
            ->all();
    }
}
