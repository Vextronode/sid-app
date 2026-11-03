<?php

namespace App\Services;

use App\Models\Family;
use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Repositories\FamilyRepository;
use App\Support\PopulationScope;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FamilyService
{
    private const DUPLICATE_NO_KK_MESSAGE = 'No KK sudah ada dalam database.';

    /** Log Aktivitas (S-05) ditulis PopulationAuditObserver. */
    public function __construct(
        protected FamilyRepository $familyRepository,
    ) {}

    /** Daftar, pilihan, dan detail KK dibatasi cakupan pembaca (PopulationScope). */
    public function paginateWithWilayah(User $user, array $filters = []): LengthAwarePaginator
    {
        return $this->familyRepository->paginateWithWilayah($this->villageId($user), $filters, PopulationScope::for($user));
    }

    public function options(User $user): Collection
    {
        return $this->familyRepository->optionsForVillage($this->villageId($user), PopulationScope::for($user));
    }

    public function find(string $id, User $user): Family
    {
        $family = $this->familyRepository->findById($id, $this->villageId($user), PopulationScope::for($user));

        if (! $family) {
            abort(404, 'Kartu Keluarga tidak ditemukan.');
        }

        return $family;
    }

    public function create(array $data, User $user): Family
    {
        $this->guardRelatedRegions($data, $user);
        $this->guardDuplicateNoKk($data['no_kk']);

        try {
            return DB::transaction(fn () => $this->familyRepository->create([
                'village_id' => $user->village_id,
                'no_kk' => $data['no_kk'],
                'family_address' => $data['family_address'],
                'family_status' => $data['family_status'] ?? 'aktif',
                'rt_id' => $data['rt_id'] ?? null,
                'rw_id' => $data['rw_id'] ?? null,
                'hamlet_id' => $data['hamlet_id'] ?? null,
            ]));
        } catch (UniqueConstraintViolationException $exception) {
            // Dua KK dengan No KK sama yang dibuat bersamaan sama-sama lolos
            // guard di atas; yang kalah dijawab 422, bukan 500. Dikenali dari
            // nama index (PostgreSQL) atau kolomnya (SQLite).
            $isDuplicateNoKk = $exception->index !== null
                ? $exception->index === 'families_no_kk_hash_unique'
                : $exception->columns === ['no_kk_hash'];

            if ($isDuplicateNoKk) {
                throw ValidationException::withMessages(['no_kk' => [self::DUPLICATE_NO_KK_MESSAGE]]);
            }

            throw $exception;
        }
    }

    public function update(Family $family, array $data, User $user): Family
    {
        $this->guardVillage($family, $user);
        $this->guardRelatedRegions($data, $user, $family);
        // No KK tidak bisa diubah setelah KK dibuat (pola sama seperti
        // NIK di citizens) — abaikan meski terkirim di payload.
        unset($data['no_kk'], $data['no_kk_hash']);

        // Transaksi: data dan Log Aktivitas dari observer tersimpan bersama.
        return DB::transaction(fn () => $this->familyRepository->update($family, $data));
    }

    public function delete(Family $family, User $user): bool
    {
        $this->guardVillage($family, $user);
        if ($this->familyRepository->hasMembers($family)) {
            abort(409, 'Kartu Keluarga tidak bisa dihapus karena masih memiliki anggota terdaftar.');
        }

        return DB::transaction(fn () => $this->familyRepository->delete($family));
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
                'no_kk' => [self::DUPLICATE_NO_KK_MESSAGE],
            ]);
        }
    }
}
