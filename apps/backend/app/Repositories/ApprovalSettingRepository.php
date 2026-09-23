<?php

namespace App\Repositories;

use App\Models\ApprovalSetting;
use Illuminate\Database\Eloquent\Collection;

class ApprovalSettingRepository
{
    public function allForVillage(int $villageId): Collection
    {
        return ApprovalSetting::query()
            ->where('village_id', $villageId)
            ->orderBy('id')
            ->get();
    }

    public function findByIdOrFail(int $id): ApprovalSetting
    {
        return ApprovalSetting::query()->findOrFail($id);
    }

    public function findByLevelAndVillage(string $approvalLevel, int $villageId): ?ApprovalSetting
    {
        return ApprovalSetting::query()
            ->where('village_id', $villageId)
            ->where('approval_level', $approvalLevel)
            ->first();
    }

    public function update(ApprovalSetting $setting, array $data): ApprovalSetting
    {
        $setting->update($data);

        return $setting;
    }
}
