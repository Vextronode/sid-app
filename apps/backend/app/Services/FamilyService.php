<?php

namespace App\Services;

use App\Models\Family;
use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Repositories\FamilyRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class FamilyService
{
    public function __construct(
        protected FamilyRepository $familyRepository,
    ) {}

    public function getAllWithWilayah(User $user): Collection
    {
        return $this->familyRepository->allWithWilayah($this->villageId($user));
    }

    public function find(string $id, User $user): Family
    {
        $family = $this->familyRepository->findById($id, $this->villageId($user));

        if (! $family) {
            abort(404, 'Kartu Keluarga tidak ditemukan.');
        }

        return $family;
    }

    public function create(array $data, User $user): Family
    {
        $this->guardRelatedRegions($data, $user);
        $this->guardDuplicateNoKk($data['no_kk']);

        return $this->familyRepository->create([
            'village_id' => $user->village_id,
            'no_kk' => $data['no_kk'],
            'family_address' => $data['family_address'],
            'family_status' => $data['family_status'] ?? 'aktif',
            'rt_id' => $data['rt_id'] ?? null,
            'rw_id' => $data['rw_id'] ?? null,
            'hamlet_id' => $data['hamlet_id'] ?? null,
        ]);
    }

    public function update(Family $family, array $data, User $user): Family
    {
        $this->guardVillage($family, $user);
        $this->guardRelatedRegions($data, $user, $family);
        // No KK tidak bisa diubah setelah KK dibuat (pola sama seperti
        // NIK di citizens) — abaikan meski terkirim di payload.
        unset($data['no_kk'], $data['no_kk_hash']);

        return $this->familyRepository->update($family, $data);
    }

    public function delete(Family $family, User $user): bool
    {
        $this->guardVillage($family, $user);
        if ($this->familyRepository->hasMembers($family)) {
            abort(409, 'Kartu Keluarga tidak bisa dihapus karena masih memiliki anggota terdaftar.');
        }

        return $this->familyRepository->delete($family);
    }

    private function villageId(User $user): string
    {
        if (! $user->village_id) {
            abort(403, 'Data wilayah desa tidak ditemukan.');
        }

        return $user->village_id;
    }

    private function guardVillage(Family $family, User $user): void
    {
        if ($family->village_id !== $this->villageId($user)) {
            abort(404, 'Kartu Keluarga tidak ditemukan.');
        }
    }

    private function guardRelatedRegions(array $data, User $user, ?Family $family = null): void
    {
        $villageId = $this->villageId($user);
        foreach (['rt_id' => Rt::class, 'rw_id' => Rw::class, 'hamlet_id' => Hamlet::class] as $field => $model) {
            $id = $data[$field] ?? $family?->{$field};
            if ($id !== null && ! $model::query()->whereKey($id)->where('village_id', $villageId)->exists()) {
                abort(422, 'Wilayah keluarga harus berasal dari desa Anda.');
            }
        }
    }

    private function guardDuplicateNoKk(string $noKk): void
    {
        $hash = hash('sha256', $noKk);

        if ($this->familyRepository->findByNoKkHash($hash)) {
            throw ValidationException::withMessages([
                'no_kk' => ['No KK sudah ada dalam database.'],
            ]);
        }
    }
}
