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
 * Jenis jabatan desa tanpa akun, dikelola Staf SIDUTama. `code` dibuat
 * sekali dari label dan tidak pernah berubah, karena officials.position
 * menyimpannya.
 *
 * Kode jabatan berakun ditulis tangan (mis. `rt`, `kadus`), bukan slug
 * labelnya, sehingga nama jabatan juga dibandingkan dengan label: "Ketua RT"
 * atau "Staf {nama aplikasi}" tidak boleh menjadi jenis jabatan ganda.
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
        $this->assertLabelAvailable($user->village_id, $data['label']);

        $code = Str::limit(Str::slug($data['label'], '_'), 50, '');

        if ($this->repository->findByCode($user->village_id, $code) !== null) {
            $this->rejectLabel();
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

        if (array_key_exists('label', $data)) {
            $this->assertLabelAvailable($type->village_id, $data['label'], ignoreId: $type->id);
        }

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

    /**
     * Nama dibandingkan dalam bentuk slug, jadi beda huruf besar/kecil atau
     * tanda baca tetap dianggap nama yang sama.
     */
    private function assertLabelAvailable(string $villageId, string $label, ?int $ignoreId = null): void
    {
        $slug = Str::limit(Str::slug($label, '_'), 50, '');

        $taken = collect(OfficialPosition::cases())
            ->flatMap(fn (OfficialPosition $position) => [$position->value, Str::slug($position->label(), '_')])
            ->merge(
                $this->repository->allForVillage($villageId)
                    ->reject(fn ($type) => $type->id === $ignoreId)
                    ->flatMap(fn ($type) => [$type->code, Str::slug($type->label, '_')])
            );

        if ($slug === '' || $taken->contains($slug)) {
            $this->rejectLabel();
        }
    }

    private function rejectLabel(): never
    {
        throw ValidationException::withMessages([
            'label' => 'Nama jabatan ini sudah dipakai. Gunakan nama lain.',
        ]);
    }
}
