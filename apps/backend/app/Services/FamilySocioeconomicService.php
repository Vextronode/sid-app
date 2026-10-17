<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\FamilySocioeconomic;
use App\Models\User;
use App\Repositories\FamilyRepository;
use App\Repositories\FamilySocioeconomicRepository;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class FamilySocioeconomicService
{
    public function __construct(
        private readonly FamilySocioeconomicRepository $repository,
        private readonly FamilyRepository $familyRepository,
        private readonly PopulationAuditService $audit,
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
        $family = $this->familyRepository->findForVillageOrFail($familyId, $this->villageId($user));

        return DB::transaction(function () use ($family, $familyId, $data, $user) {
            $existing = $this->repository->findByFamilyId($familyId);
            $before = $existing ? clone $existing : null;

            $socioeconomic = $this->repository->upsertForFamily($familyId, [
                ...$data,
                'surveyed_by' => $user->id,
                'surveyed_at' => now(),
            ]);
            // Riwayat dicatat atas nama KK-nya (S-05).
            $socioeconomic->setRelation('family', $family);

            $before === null
                ? $this->audit->created($socioeconomic, $user, event: 'socioeconomic_updated')
                : $this->audit->updated($before, $socioeconomic, $user, event: 'socioeconomic_updated');

            return $socioeconomic;
        });
    }

    private function villageId(User $user): string
    {
        if ($user->role !== 'staf_sid' || ! $user->is_active || ! $user->village_id) {
            throw new HttpException(403, UserRole::stafSidLabel().' aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
