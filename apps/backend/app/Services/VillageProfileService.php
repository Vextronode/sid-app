<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use App\Models\Village;
use App\Repositories\VillageRepository;
use App\Support\VillageImageOptimizer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class VillageProfileService
{
    public function __construct(
        private readonly VillageRepository $repository,
        private readonly VillageImageOptimizer $imageOptimizer,
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

    /**
     * Ganti logo atau foto hero desa. Gambar ini tampil di halaman publik,
     * jadi disimpan di disk public, setelah diperkecil (VillageImageOptimizer)
     * agar beranda cepat dimuat. Berkas lama dihapus hanya bila itu unggahan
     * sebelumnya, bukan aset frontend dari seeder.
     */
    public function replaceImage(User $user, string $column, UploadedFile $image): Village
    {
        $this->assertActivePetugas($user);
        $village = $this->getProfile($user);
        $oldValue = $village->{$column};

        $optimized = $this->imageOptimizer->optimize($image, $column);
        $newPath = "village-media/{$village->id}/".Str::random(40).'.'.$optimized['extension'];
        Storage::disk('public')->put($newPath, $optimized['contents']);

        try {
            $village = $this->repository->update($village, [$column => $newPath]);
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($newPath);
            throw $exception;
        }

        if (Village::isUploadedMedia($oldValue)) {
            Storage::disk('public')->delete($oldValue);
        }

        return $village;
    }

    private function assertActivePetugas(User $user): void
    {
        if ($user->role !== 'staf_sid' || ! $user->is_active || ! $user->village_id) {
            throw new HttpException(403, UserRole::stafSidLabel().' aktif dengan desa yang valid diperlukan.');
        }
    }
}
