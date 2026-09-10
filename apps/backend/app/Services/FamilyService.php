<?php

namespace App\Services;

use App\Models\Family;
use App\Models\User;
use App\Repositories\FamilyRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class FamilyService
{
    public function __construct(
        protected FamilyRepository $familyRepository,
    ) {}

    public function getAllWithWilayah(): Collection
    {
        return $this->familyRepository->allWithWilayah();
    }

    public function find(int $id): Family
    {
        $family = $this->familyRepository->findById($id);

        if (! $family) {
            abort(404, 'Kartu Keluarga tidak ditemukan.');
        }

        return $family;
    }

    public function create(array $data, User $user): Family
    {
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

    public function update(Family $family, array $data): Family
    {
        // No KK tidak bisa diubah setelah KK dibuat (pola sama seperti
        // NIK di citizens) — abaikan meski terkirim di payload.
        unset($data['no_kk'], $data['no_kk_hash']);

        return $this->familyRepository->update($family, $data);
    }

    public function delete(Family $family): bool
    {
        if (Schema::hasColumn('citizens', 'family_id') && $family->members()->exists()) {
            abort(409, 'Kartu Keluarga tidak bisa dihapus karena masih memiliki anggota terdaftar.');
        }

        return $this->familyRepository->delete($family);
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
