<?php

namespace App\Services;

use App\Models\FamilySocioeconomic;
use App\Models\User;
use App\Repositories\FamilyRepository;
use App\Repositories\FamilySocioeconomicRepository;
use Symfony\Component\HttpKernel\Exception\HttpException;

class FamilySocioeconomicService
{
    public function __construct(
        private readonly FamilySocioeconomicRepository $repository,
        private readonly FamilyRepository $familyRepository,
    ) {}

    public function get(User $user, string $familyId): FamilySocioeconomic
    {
        $this->familyRepository->findForVillageOrFail($familyId, $this->villageId($user));

        $socioeconomic = $this->repository->findByFamilyId($familyId);

        if (! $socioeconomic) {
            throw new HttpException(404, 'Data sosio-ekonomi belum tersedia untuk keluarga ini.');
        }

        return $socioeconomic;
    }

    /**
     * surveyed_by/surveyed_at are set automatically to the authenticated user and request time.
     */
    public function upsert(User $user, string $familyId, array $data): FamilySocioeconomic
    {
        $this->familyRepository->findForVillageOrFail($familyId, $this->villageId($user));

        return $this->repository->upsertForFamily($familyId, [
            ...$data,
            'surveyed_by' => $user->id,
            'surveyed_at' => now(),
        ]);
    }

    private function villageId(User $user): string
    {
        if ($user->role !== 'petugas_desa' || ! $user->is_active || ! $user->village_id) {
            throw new HttpException(403, 'Petugas Desa aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
