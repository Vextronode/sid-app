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

    public function get(int $citizenId): CitizenSocioeconomic
    {
        $this->citizenRepository->findOrFail($citizenId);

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
    public function upsert(User $user, int $citizenId, array $data): CitizenSocioeconomic
    {
        $this->citizenRepository->findOrFail($citizenId);

        return $this->repository->upsertForCitizen($citizenId, [
            ...$data,
            'surveyed_by' => $user->id,
            'surveyed_at' => now(),
        ]);
    }
}
