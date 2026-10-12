<?php

namespace App\Services;

use App\Enums\ApprovalLevel;
use App\Models\ApprovalSetting;
use App\Models\User;
use App\Repositories\ApprovalSettingRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

class ApprovalSettingService
{
    /**
     * Dipakai hanya kalau baris approval_settings untuk level+desa
     * terkait belum ke-seed (seharusnya tidak pernah terjadi - lihat
     * ApprovalSettingSeeder yang mengisi level RT dan kepala_desa
     * saat instalasi). Murni jaring pengaman supaya alur submit/approve
     * surat tidak ikut gagal hanya karena baris config hilang.
     */
    private const FALLBACK_DEADLINE_HOURS = 24;

    public function __construct(
        private readonly ApprovalSettingRepository $repository,
    ) {}

    public function list(User $user): Collection
    {
        return $this->repository->allForVillage($user->village_id);
    }

    public function update(int $id, array $data, User $user): ApprovalSetting
    {
        $setting = $this->repository->findByIdOrFail($id);

        if (! $user->is_active || $user->role !== 'petugas_desa' || ! $user->village_id || $setting->village_id !== $user->village_id) {
            abort(404, 'Pengaturan approval tidak ditemukan.');
        }

        if (! in_array($setting->approval_level, ApprovalLevel::approverCases(), true)) {
            abort(404, 'Pengaturan approval tidak ditemukan.');
        }

        return $this->repository->update($setting, $data);
    }

    /**
     * EV5-9-S2. Titik tunggal resolve "kapan deadline_at approval untuk
     * level & desa tertentu", menggantikan hardcode now()->addDays(n)
     * yang sebelumnya tersebar di LetterService/RtApprovalService.
     */
    public function resolveDeadline(string $approvalLevel, string $villageId): Carbon
    {
        $setting = $this->repository->findByLevelAndVillage($approvalLevel, $villageId);

        return now()->addHours($setting->deadline_hours ?? self::FALLBACK_DEADLINE_HOURS);
    }
}
