<?php

namespace App\Services;

use App\Enums\LetterTypeCategory;
use App\Models\Letter;
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
     * $includeInactive (khusus Staf SIDUTama, dijaga IndexLetterTypeRequest):
     * semua jenis desa termasuk Draft dan Nonaktif.
     */
    public function list(User $user, bool $includeInactive = false): Collection
    {
        $villageId = $this->villageId($user);

        return $includeInactive
            ? $this->letterTypeRepository->allForVillage($villageId)
            : $this->letterTypeRepository->allSubmittable($villageId);
    }

    public function update(LetterType $letterType, array $data, User $user): LetterType
    {
        $letterType = $this->letterTypeRepository->findOrFail($letterType->id, $this->villageId($user));

        if (($data['is_active'] ?? false) === true && ! $letterType->isReady()) {
            throw ValidationException::withMessages([
                'is_active' => 'Jenis surat draft belum memiliki template sehingga tidak dapat diaktifkan.',
            ]);
        }

        // Kategori menentukan petugas: Persuratan Desa -> Kaur TU & Umum,
        // Layanan Kependudukan -> Kasi Pemerintahan.
        if (isset($data['category'])) {
            $data['assigned_role'] = LetterTypeCategory::from($data['category'])->handlerRole()->value;
        }

        return $this->letterTypeRepository->update($letterType, $data);
    }

    /**
     * Formulir isi tangan hanya untuk pemohon (akun warga aktif yang dapat
     * mengajukan surat) di desa jenis surat itu, dan hanya untuk jenis
     * surat yang sedang dapat diajukan. Identitas pemohon ikut tercetak.
     */
    public function handwrittenFormType(LetterType $letterType, User $user): LetterType
    {
        if ($user->cannot('create', Letter::class)) {
            abort(403, 'Formulir hanya dapat diunduh oleh warga yang akan mengajukan surat.');
        }

        $letterType = $this->letterTypeRepository->findOrFail($letterType->id, $this->villageId($user));

        if (! $letterType->is_active || ! $letterType->isReady()) {
            abort(404, 'Jenis surat ini sedang tidak dapat diajukan.');
        }

        return $letterType;
    }

    private function villageId(User $user): string
    {
        if (! $user->is_active || ! $user->village_id) {
            abort(403, 'Akun aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
