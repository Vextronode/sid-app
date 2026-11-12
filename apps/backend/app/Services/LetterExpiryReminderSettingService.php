<?php

namespace App\Services;

use App\Models\LetterExpiryReminderSetting;
use App\Models\User;
use App\Repositories\LetterExpiryReminderSettingRepository;
use Illuminate\Database\Eloquent\Collection;

/**
 * Nyala/mati titik pengingat masa berlaku surat oleh Staf SIDUTama.
 * Dibaca LetterExpiryReminderService saat command berjalan.
 */
class LetterExpiryReminderSettingService
{
    public function __construct(
        private readonly LetterExpiryReminderSettingRepository $repository,
    ) {}

    /**
     * @return Collection<int, LetterExpiryReminderSetting>
     */
    public function list(User $user): Collection
    {
        return $this->repository->allForVillage($user->village_id);
    }

    /**
     * Saat titik dinyalakan dari keadaan mati, activated_at diisi waktu
     * sekarang: jatuh tempo sebelum itu tidak dikirim, agar warga tidak
     * menerima pengingat serentak.
     */
    public function update(int $id, bool $isActive, User $user): LetterExpiryReminderSetting
    {
        $setting = $this->repository->findByIdOrFail($id);

        if (! $user->is_active || ! $user->village_id || $setting->village_id !== $user->village_id) {
            abort(404, 'Pengaturan pengingat tidak ditemukan.');
        }

        $data = ['is_active' => $isActive];

        if ($isActive && ! $setting->is_active) {
            $data['activated_at'] = now();
        }

        return $this->repository->update($setting, $data);
    }
}
