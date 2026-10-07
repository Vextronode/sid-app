<?php

namespace App\Services;

use App\Models\User;
use App\Models\Village;
use App\Repositories\VillageRepository;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

class VillageProfileService
{
    public function __construct(
        private readonly VillageRepository $repository,
    ) {}

    public function getProfile(User $user): Village
    {
        $village = $this->repository->findById($user->village_id);

        if (! $village) {
            throw new HttpException(404, 'Profil desa belum tersedia.');
        }

        return $village;
    }

    public function updateProfile(User $user, array $data): Village
    {
        $village = $this->getProfile($user);

        return $this->repository->update($village, $data);
    }

    public function replaceStamp(User $user, UploadedFile $stamp): Village
    {
        $this->assertActivePetugas($user);
        $village = $this->getProfile($user);
        $directory = "village-stamps/{$village->id}";
        $newPath = $stamp->store($directory, 'private_uploads');
        $oldPath = $village->stamp_img;

        try {
            $village = $this->repository->update($village, ['stamp_img' => $newPath]);
        } catch (\Throwable $exception) {
            Storage::disk('private_uploads')->delete($newPath);
            throw $exception;
        }

        $this->deletePreviousFile($oldPath, $directory);

        return $village;
    }

    public function stampPreview(User $user): BinaryFileResponse
    {
        $this->assertActivePetugas($user);
        $village = $this->getProfile($user);

        $directory = "village-stamps/{$village->id}";
        if (
            ! $village->stamp_img
            || ! str_starts_with($village->stamp_img, $directory.'/')
            || ! Storage::disk('private_uploads')->exists($village->stamp_img)
        ) {
            throw new HttpException(404, 'Stempel desa belum tersedia.');
        }

        $response = response()->file(Storage::disk('private_uploads')->path($village->stamp_img), [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
        $response->setPrivate();
        $response->headers->set('Cache-Control', 'private, no-store');

        return $response;
    }

    private function deletePreviousFile(?string $path, string $directory): void
    {
        if ($path && str_starts_with($path, $directory.'/')) {
            Storage::disk('private_uploads')->delete($path);
        }
    }

    private function assertActivePetugas(User $user): void
    {
        if ($user->role !== 'petugas_desa' || ! $user->is_active || ! $user->village_id) {
            throw new HttpException(403, 'Petugas Desa aktif dengan desa yang valid diperlukan.');
        }
    }
}
