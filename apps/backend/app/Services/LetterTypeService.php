<?php

namespace App\Services;

use App\Models\LetterType;
use App\Models\User;
use App\Repositories\LetterTypeRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class LetterTypeService
{
    public function __construct(
        protected LetterTypeRepository $letterTypeRepository,
    ) {}

    /**
     * Default: hanya jenis aktif ber-template (dipakai warga saat submit).
     * $includeInactive (khusus Petugas Desa, dijaga IndexLetterTypeRequest):
     * semua jenis desa termasuk Draft dan Nonaktif.
     */
    public function list(User $user, bool $includeInactive = false): Collection
    {
        $villageId = $this->villageId($user);

        return $includeInactive
            ? $this->letterTypeRepository->allForVillage($villageId)
            : $this->letterTypeRepository->allActiveWithTemplate($villageId);
    }

    public function update(LetterType $letterType, array $data, User $user): LetterType
    {
        $letterType = $this->letterTypeRepository->findOrFail($letterType->id, $this->villageId($user));

        if (($data['is_active'] ?? false) === true && $letterType->template === null) {
            throw ValidationException::withMessages([
                'is_active' => 'Jenis surat draft belum memiliki template sehingga tidak dapat diaktifkan.',
            ]);
        }

        return $this->letterTypeRepository->update($letterType, $data);
    }

    private function villageId(User $user): string
    {
        if (! $user->is_active || ! $user->village_id) {
            abort(403, 'Akun aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
