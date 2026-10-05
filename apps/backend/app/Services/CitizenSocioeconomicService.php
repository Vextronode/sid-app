<?php

namespace App\Services;

use App\Models\CitizenSocioeconomic;
use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Repositories\CitizenSocioeconomicRepository;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CitizenSocioeconomicService
{
    public function __construct(
        private readonly CitizenSocioeconomicRepository $repository,
        private readonly CitizenRepository $citizenRepository,
    ) {}

    public function get(User $user, string $citizenId): CitizenSocioeconomic
    {
        $this->citizenRepository->findForVillageOrFail($citizenId, $this->villageId($user));

        $socioeconomic = $this->repository->findByCitizenId($citizenId);

        if (! $socioeconomic) {
            throw new HttpException(404, 'Data sosio-ekonomi belum tersedia untuk warga ini.');
        }

        return $socioeconomic;
    }

    /**
     * UC-09 lanjutan. surveyed_by/surveyed_at diisi otomatis dari user
     * yang login dan waktu request (upsertCitizenSocioeconomic).
     */
    public function upsert(User $user, string $citizenId, array $data): CitizenSocioeconomic
    {
        $this->citizenRepository->findForVillageOrFail($citizenId, $this->villageId($user));

        return $this->repository->upsertForCitizen($citizenId, [
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
