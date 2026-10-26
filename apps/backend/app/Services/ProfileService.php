<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Repositories\UserRepository;

class ProfileService
{
    public function __construct(
        protected UserRepository $userRepository,
        protected CitizenRepository $citizenRepository,
    ) {}

    public function updateProfile(User $user, array $data): User
    {
        if (array_key_exists('email', $data) && $data['email'] !== $user->email) {
            $user->email_verified_at = null;
        }

        return $this->userRepository->update($user, $data);
    }

    /**
     * Nama dan No. KK warga desa ini ber-NIK tersebut, untuk isian otomatis
     * di form surat (mis. saksi). Pemilik NIK yang punya akun harus
     * menyetujui dulu, jadi namanya disamarkan dan No. KK-nya tidak dibuka;
     * warga tanpa akun dibuka penuh (diverifikasi RT).
     *
     * @return array{found: bool, has_account: bool, name: string|null, family_number: string|null}
     */
    public function lookupCitizenName(User $user, string $nik): array
    {
        $citizen = $user->village_id ? $this->citizenRepository->findActiveInVillageByNik($user->village_id, $nik) : null;

        $account = $citizen ? $this->userRepository->findByCitizenId($citizen->id) : null;
        $hasAccount = $account !== null && $account->is_active;

        return [
            'found' => $citizen !== null,
            'has_account' => $hasAccount,
            'name' => $citizen === null ? null : ($hasAccount ? self::maskName($citizen->name) : $citizen->name),
            'family_number' => $hasAccount ? null : $citizen?->family?->no_kk,
            // NIK milik pemohon sendiri (mis. tidak boleh menjadi saksinya).
            'is_self' => $citizen !== null && $citizen->id === $user->citizen_id,
        ];
    }

    /**
     * "Ujang Saksi" -> "U***g S***i".
     */
    private static function maskName(string $name): string
    {
        return implode(' ', array_map(
            fn (string $word): string => mb_strlen($word) <= 2
                ? mb_substr($word, 0, 1).str_repeat('*', max(mb_strlen($word) - 1, 0))
                : mb_substr($word, 0, 1).str_repeat('*', mb_strlen($word) - 2).mb_substr($word, -1),
            preg_split('/\s+/', trim($name)) ?: [],
        ));
    }

    public function updatePassword(User $user, array $data): User
    {
        return $this->userRepository->update($user, [
            'password' => $data['password'],
            'must_change_password' => false,
        ]);
    }
}
