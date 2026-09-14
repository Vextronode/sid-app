<?php

namespace App\Services;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use Illuminate\Database\Eloquent\Collection;

class OfficialService
{
    public function __construct(
        protected OfficialRepository $officialRepository,
        protected UserRepository $userRepository,
    ) {}

    public function resolveRtForCitizen(Citizen $citizen)
    {
        return $this->officialRepository->findActiveRtByRtId($citizen->rt_id);
    }

    public function getCurrentOfficial(User $user): Official
    {
        return $user->official()
            ->where('is_active', true)
            ->firstOrFail();
    }

    public function getCurrentRw(User $user): Official
    {
        return $user->official()
            ->where('position', 'rw')
            ->where('is_active', true)
            ->firstOrFail();
    }

    public function getCurrentRt(User $user): Official
    {
        return $user->official()
            ->where('position', 'rt')
            ->where('is_active', true)
            ->firstOrFail();
    }

    public function resolveNextOfficials(
        Official $official
    ) {

        return match ($official->position) {

            'rt' => $this->officialRepository->allActiveRwByRwId($official->rw_id),

            'rw' => $this->officialRepository->allActiveByPositionsAndVillage([
                'kasi_pelayanan',
                'kaur_tu_umum',
                'petugas_desa',
            ], $official->village_id),

            default => collect(),
        };
    }

    public function resolveCitizenUser(
        Letter $letter
    ): ?User {

        return $this->userRepository->findByCitizenId($letter->citizen_id);
    }

    public function resolveVillageHead(): ?Official
    {
        return $this->officialRepository->findActiveVillageHead();
    }

    public function getAllWithRelations(): Collection
    {
        return $this->officialRepository->allWithRelations();
    }

    public function getForShow(int $id): Official
    {
        return $this->officialRepository->findWithRelationsOrFail($id);
    }

    public function create(array $data): Official
    {
        $this->guardSinglePositionPerScope($data);

        return $this->officialRepository->create($data);
    }

    public function update(Official $official, array $data): Official
    {
        $merged = array_merge([
            'position' => $official->position,
            'village_id' => $official->village_id,
            'rt_id' => $official->rt_id,
            'rw_id' => $official->rw_id,
            'hamlet_id' => $official->hamlet_id,
            'is_active' => $official->is_active,
        ], $data);

        $this->guardSinglePositionPerScope($merged, excludeId: $official->id);

        return $this->officialRepository->update($official, $data);
    }

    public function delete(Official $official): bool
    {
        return $this->officialRepository->delete($official);
    }

    /**
     * Mencegah dua pejabat aktif sekaligus menjabat posisi yang sama
     * pada lingkup wilayah yang sama (mis. dua RT aktif untuk rt_id
     * yang sama, atau dua Kepala Desa aktif dalam satu village).
     * Hanya diperiksa ketika data yang disimpan berstatus aktif.
     */
    private function guardSinglePositionPerScope(array $data, ?int $excludeId = null): void
    {
        $isActive = $data['is_active'] ?? true;

        if (! $isActive) {
            return;
        }

        $exists = $this->officialRepository->existsActiveByPositionAndScope(
            position: $data['position'],
            villageId: $data['village_id'] ?? null,
            rtId: $data['rt_id'] ?? null,
            rwId: $data['rw_id'] ?? null,
            hamletId: $data['hamlet_id'] ?? null,
            excludeId: $excludeId,
        );

        if ($exists) {
            abort(409, 'Sudah ada pejabat aktif lain untuk posisi dan wilayah yang sama.');
        }
    }
}
