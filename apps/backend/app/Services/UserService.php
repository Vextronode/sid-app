<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

class UserService
{
    public function __construct(
        protected UserRepository $userRepository,
    ) {}

    public function getAllWithCitizenAndOfficial(): Collection
    {
        return $this->userRepository->allWithCitizenAndOfficial();
    }

    public function toggleActive(User $user, User $actingUser): User
    {
        $this->guardDeactivation($user, $actingUser, $user->is_active);

        return $this->userRepository->toggleActive($user);
    }

    public function getCurrentUserProfile(User $user): User
    {
        return $this->userRepository->findWithFullProfile($user);
    }

    /**
     * UC-14 Edit/Nonaktifkan Akun. Guard (tidak berubah dari v4.2):
     * tidak bisa menonaktifkan diri sendiri, dan tidak bisa
     * menonaktifkan satu-satunya akun petugas_desa aktif yang tersisa
     * (paths/users/user-detail.yaml).
     */
    public function update(User $user, array $data, User $actingUser): User
    {
        $deactivating = array_key_exists('is_active', $data) && ! $data['is_active'] && $user->is_active;

        $this->guardDeactivation($user, $actingUser, $deactivating);

        return $this->userRepository->update($user, $data);
    }

    public function resetPassword(User $target, User $actor): string
    {
        if ($actor->role !== 'petugas_desa' || ! $actor->is_active) {
            abort(403, 'Aksi ini hanya dapat dilakukan oleh Petugas Desa aktif.');
        }

        if ($target->is($actor)) {
            abort(403, 'Petugas Desa tidak dapat mengatur ulang kata sandi akunnya sendiri.');
        }

        if ($target->role === 'petugas_desa') {
            abort(403, 'Petugas Desa tidak dapat mengatur ulang kata sandi Petugas Desa lain.');
        }

        return $this->setTemporaryPassword($target);
    }

    public function resetPasswordForCommand(User $target): string
    {
        return $this->setTemporaryPassword($target);
    }

    private function setTemporaryPassword(User $target): string
    {
        $temporaryPassword = Str::random(12);
        $this->userRepository->update($target, [
            'password' => $temporaryPassword,
            'must_change_password' => true,
        ]);

        return $temporaryPassword;
    }

    private function guardDeactivation(User $target, User $actingUser, bool $deactivating): void
    {
        if (! $deactivating) {
            return;
        }

        if ($target->is($actingUser)) {
            abort(403, 'Anda tidak dapat menonaktifkan akun Anda sendiri.');
        }

        if ($target->role === 'petugas_desa' && $this->userRepository->countActiveByRole('petugas_desa') <= 1) {
            abort(403, 'Tidak dapat menonaktifkan satu-satunya akun Petugas Desa yang masih aktif.');
        }
    }
}
