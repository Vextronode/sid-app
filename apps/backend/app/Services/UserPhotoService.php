<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Foto profil akun warga. Warga mengelola fotonya sendiri, dan Staf SIDUTama
 * boleh mengganti atau menghapusnya. Selama akun berperan pejabat (RT
 * sampai Kepala Desa, termasuk Staf SIDUTama), foto yang dipakai adalah
 * foto pejabat (officials.photo_img) yang hanya dikelola Staf SIDUTama lewat
 * halaman Pejabat Desa; setelah kembali menjadi warga, foto akun bisa
 * diubah lagi.
 */
class UserPhotoService
{
    public function __construct(
        private readonly UserRepository $userRepository,
    ) {}

    public function replaceOwn(User $user, UploadedFile $photo): User
    {
        $this->assertWarga($user, 'Foto pejabat dikelola '.UserRole::stafSidLabel().' lewat halaman Pejabat Desa.', 403);

        return $this->replace($user, $photo);
    }

    public function deleteOwn(User $user): User
    {
        $this->assertWarga($user, 'Foto pejabat dikelola '.UserRole::stafSidLabel().' lewat halaman Pejabat Desa.', 403);

        return $this->delete($user);
    }

    public function replaceFor(User $target, User $actor, UploadedFile $photo): User
    {
        $this->assertManageable($target, $actor);

        return $this->replace($target, $photo);
    }

    public function deleteFor(User $target, User $actor): User
    {
        $this->assertManageable($target, $actor);

        return $this->delete($target);
    }

    private function replace(User $user, UploadedFile $photo): User
    {
        $oldPath = $user->photo_img;
        $newPath = $photo->store("user-photos/{$user->village_id}", 'public');

        try {
            $user = $this->userRepository->update($user, ['photo_img' => $newPath]);
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($newPath);
            throw $exception;
        }

        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return $user;
    }

    private function delete(User $user): User
    {
        $oldPath = $user->photo_img;
        $user = $this->userRepository->update($user, ['photo_img' => null]);

        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return $user;
    }

    private function assertManageable(User $target, User $actor): void
    {
        if ($target->village_id !== $actor->village_id) {
            throw new HttpException(404, 'Pengguna tidak ditemukan.');
        }

        $this->assertWarga(
            $target,
            'Akun ini sedang menjabat. Ganti fotonya di halaman Pejabat Desa.',
            422,
        );
    }

    private function assertWarga(User $user, string $message, int $status): void
    {
        if ($user->role !== 'warga') {
            throw new HttpException($status, $message);
        }
    }
}
