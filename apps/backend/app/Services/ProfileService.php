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
     * di form surat (mis. saksi). Hanya kedua data itu yang dikembalikan.
     *
     * @return array{found: bool, name: string|null, family_number: string|null}
     */
    public function lookupCitizenName(User $user, string $nik): array
    {
        $citizen = $user->village_id ? $this->citizenRepository->findActiveInVillageByNik($user->village_id, $nik) : null;

        return [
            'found' => $citizen !== null,
            'name' => $citizen?->name,
            'family_number' => $citizen?->family?->no_kk,
        ];
    }

    public function updatePassword(User $user, array $data): User
    {
        return $this->userRepository->update($user, [
            'password' => $data['password'],
            'must_change_password' => false,
        ]);
    }
}
