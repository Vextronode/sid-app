<?php

namespace App\Services;

use App\Models\LetterExpiryReminderSetting;
use App\Models\User;
use App\Models\Village;
use App\Repositories\LetterExpiryReminderSettingRepository;
use App\Repositories\VillageRepository;
use Illuminate\Database\Eloquent\Collection;

/**
 * Nyala/mati titik pengingat masa berlaku surat dan jam kirimnya, oleh
 * Staf SIDUTama. Dibaca LetterExpiryReminderService saat command berjalan.
 */
class LetterExpiryReminderSettingService
{
    public function __construct(
        private readonly LetterExpiryReminderSettingRepository $repository,
        private readonly VillageRepository $villageRepository,
    ) {}

    /** Jam kirim desa pengguna, format H:i. */
    public function sendTime(User $user): string
    {
        $village = $user->village_id ? $this->villageRepository->findById($user->village_id) : null;

        return $village?->expiryReminderSendTime() ?? Village::DEFAULT_EXPIRY_REMINDER_SEND_AT;
    }

    /**
     * Mengubah jam kirim desa pengguna. $sendTime sudah divalidasi sebagai
     * jam bulat (H:i) dalam rentang yang diizinkan.
     *
     * @return string jam kirim tersimpan, format H:i
     */
    public function updateSendTime(string $sendTime, User $user): string
    {
        $village = $user->is_active && $user->village_id
            ? $this->villageRepository->findById($user->village_id)
            : null;

        if (! $village) {
            abort(404, 'Data desa tidak ditemukan.');
        }

        $this->villageRepository->update($village, ['expiry_reminder_send_at' => "{$sendTime}:00"]);

        return $village->expiryReminderSendTime();
    }

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
