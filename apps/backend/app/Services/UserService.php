<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class UserService
{
    public function __construct(
        protected UserRepository $userRepository,
        protected OfficialRepository $officialRepository,
    ) {}

    public function getAllWithCitizenAndOfficial(User $actor): Collection
    {
        $this->assertPetugas($actor);

        return $this->userRepository->allWithCitizenAndOfficial($actor->village_id);
    }

    public function toggleActive(User $user, User $actingUser): User
    {
        $this->assertSameVillage($user, $actingUser);
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
     * menonaktifkan satu-satunya akun staf_sid aktif yang tersisa
     * (paths/users/user-detail.yaml).
     */
    public function update(User $user, array $data, User $actingUser): User
    {
        $this->assertSameVillage($user, $actingUser);
        $deactivating = array_key_exists('is_active', $data) && ! $data['is_active'] && $user->is_active;

        $this->guardDeactivation($user, $actingUser, $deactivating);

        return $this->userRepository->update($user, $data);
    }

    public function resetPassword(User $target, User $actor): string
    {
        $this->assertSameVillage($target, $actor);

        if ($target->is($actor)) {
            abort(403, UserRole::stafSidLabel().' tidak dapat mengatur ulang kata sandi akunnya sendiri.');
        }

        if ($target->role === 'staf_sid') {
            abort(403, UserRole::stafSidLabel().' tidak dapat mengatur ulang kata sandi '.UserRole::stafSidLabel().' lain.');
        }

        return $this->setTemporaryPassword($target);
    }

    /**
     * A-18. Jalur pemulihan darurat lewat CLI (`staf-sid:recover`) bila
     * satu-satunya staf_sid desa lupa kata sandi: staf tidak dapat mereset
     * kata sandinya sendiri dari aplikasi. Hanya akun staf_sid aktif dengan
     * jabatan aktif; sesi & token lama dicabut dan pemulihan dicatat.
     *
     * @return array{user: User, temporary_password: string}
     */
    public function recoverStafSid(string $username): array
    {
        $label = UserRole::stafSidLabel();
        $user = $this->userRepository->findByUsername($username);

        if ($user === null) {
            throw new RuntimeException("Akun dengan username \"{$username}\" tidak ditemukan.");
        }

        if ($user->role !== 'staf_sid') {
            throw new RuntimeException("Akun {$user->username} bukan {$label}. Pemulihan hanya untuk akun {$label}.");
        }

        if (! $user->is_active || ! $this->officialRepository->existsActiveForUser($user->id)) {
            throw new RuntimeException("Akun {$user->username} tidak aktif atau tidak memegang jabatan {$label} aktif.");
        }

        return DB::transaction(function () use ($user, $label): array {
            $temporaryPassword = Str::password(32);

            $this->userRepository->update($user, [
                'password' => $temporaryPassword,
                'must_change_password' => true,
            ]);

            $user->tokens()->delete();

            if (config('session.driver') === 'database') {
                DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
            }

            activity('user')
                ->performedOn($user)
                ->event('staf_sid_recovered')
                ->withProperties([
                    'via' => 'cli',
                    'host' => gethostname() ?: null,
                ])
                ->log("Kata sandi {$label} dipulihkan lewat CLI");

            return ['user' => $user->fresh(), 'temporary_password' => $temporaryPassword];
        });
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

        if ($target->role === 'staf_sid' && $this->userRepository->countActiveByRole('staf_sid', $actingUser->village_id) <= 1) {
            abort(403, 'Tidak dapat menonaktifkan satu-satunya akun '.UserRole::stafSidLabel().' yang masih aktif.');
        }
    }

    private function assertPetugas(User $actor): void
    {
        if ($actor->role !== 'staf_sid' || ! $actor->is_active || ! $actor->village_id) {
            abort(403, 'Aksi ini hanya dapat dilakukan oleh '.UserRole::stafSidLabel().' aktif.');
        }
    }

    private function assertSameVillage(User $target, User $actor): void
    {
        $this->assertPetugas($actor);
        if ($target->village_id !== $actor->village_id) {
            abort(404, 'Akun tidak ditemukan.');
        }
    }
}
