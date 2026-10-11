<?php

namespace App\Services;

use App\Enums\OfficialPosition;
use App\Models\OfficialPositionType;
use App\Models\User;
use App\Repositories\OfficialPositionTypeRepository;
use App\Repositories\OfficialRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Jenis jabatan desa tanpa akun, dikelola Petugas Desa. `code` dibuat
 * sekali dari label dan tidak pernah berubah, karena officials.position
 * menyimpannya.
 */
class OfficialPositionTypeService
{
    public function __construct(
        private readonly OfficialPositionTypeRepository $repository,
        private readonly OfficialRepository $officialRepository,
    ) {}

    public function list(User $user): Collection
    {
        return $this->repository->allForVillage($user->village_id);
    }

    public function create(User $user, array $data): OfficialPositionType
    {
        $code = Str::limit(Str::slug($data['label'], '_'), 50, '');

        if (
            $code === ''
            || OfficialPosition::tryFrom($code) !== null
            || $this->repository->findByCode($user->village_id, $code) !== null
        ) {
            throw ValidationException::withMessages([
                'label' => 'Nama jabatan ini sudah dipakai. Gunakan nama lain.',
            ]);
        }

        return $this->repository->create([
            'village_id' => $user->village_id,
            'code' => $code,
            'label' => $data['label'],
            'is_single_occupant' => $data['is_single_occupant'] ?? true,
            'sort_order' => $data['sort_order'] ?? $this->repository->nextSortOrder($user->village_id),
            'is_active' => $data['is_active'] ?? true,
        ]);
    }

    public function update(User $user, int $id, array $data): OfficialPositionType
    {
        $type = $this->repository->findByIdForVillageOrFail($id, $user->village_id);
        $activeHolders = $this->officialRepository->countActiveByPositionAndVillage($type->code, $type->village_id);

        if (($data['is_active'] ?? true) === false && $type->is_active && $activeHolders > 0) {
            abort(409, 'Jabatan ini masih dijabat. Akhiri jabatan pejabatnya lebih dulu.');
        }

        if (($data['is_single_occupant'] ?? false) === true && ! $type->is_single_occupant && $activeHolders > 1) {
            abort(409, 'Jabatan ini sedang dijabat lebih dari satu orang.');
        }

        return $this->repository->update($type, $data);
    }

    public function delete(User $user, int $id): void
    {
        $type = $this->repository->findByIdForVillageOrFail($id, $user->village_id);

        if ($this->officialRepository->existsByPositionAndVillage($type->code, $type->village_id)) {
            abort(409, 'Jabatan ini punya riwayat pejabat sehingga tidak dapat dihapus. Nonaktifkan saja.');
        }

        $this->repository->delete($type);
    }
}
