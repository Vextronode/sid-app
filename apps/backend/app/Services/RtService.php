<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Exceptions\RecordInUseException;
use App\Exceptions\RegionHasActiveCitizensException;
use App\Models\Rt;
use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Repositories\ReferenceRepository;
use App\Repositories\RtRepository;
use App\Repositories\RwRepository;
use App\Support\PopulationScope;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RtService
{
    public function __construct(
        protected RtRepository $rtRepository,
        protected RwRepository $rwRepository,
        protected CitizenRepository $citizenRepository,
        protected ReferenceRepository $referenceRepository,
    ) {}

    public function getAllOrderedByNumber(User $user, ?int $rwId = null): Collection
    {
        return $this->rtRepository->allOrderedByNumber($this->readableVillageId($user), $rwId, PopulationScope::for($user));
    }

    public function create(array $data, User $user): Rt
    {
        $villageId = $this->villageId($user);
        // RW dikirim di isi request: milik desa lain = input salah (422).
        $rw = $this->rwRepository->findForVillage((int) $data['rw_id'], $villageId)
            ?? throw ValidationException::withMessages(['rw_id' => ['RW harus berasal dari desa Anda.']]);

        return $this->guardDuplicateNumber(fn () => $this->rtRepository->create([
            'rw_id' => $data['rw_id'],
            'village_id' => $rw->village_id,
            'number' => $data['number'],
            'is_active' => true,
        ]));
    }

    public function update(Rt $rt, array $data, User $user): Rt
    {
        if ($rt->village_id !== $this->villageId($user)) {
            abort(404, 'RT tidak ditemukan.');
        }
        $isDeactivating = array_key_exists('is_active', $data)
            && ! $data['is_active']
            && $rt->is_active;

        if ($isDeactivating && $this->citizenRepository->existsActiveByRt($rt->id)) {
            throw new RegionHasActiveCitizensException('RT');
        }

        return $this->guardDuplicateNumber(fn () => $this->rtRepository->update($rt, $data));
    }

    public function delete(Rt $rt, User $user): bool
    {
        if ($rt->village_id !== $this->villageId($user)) {
            abort(404, 'RT tidak ditemukan.');
        }
        $usedBy = $this->referenceRepository->regionUsedBy($rt);
        if ($usedBy !== []) {
            throw RecordInUseException::region('RT', $usedBy);
        }

        return $this->rtRepository->delete($rt);
    }

    /**
     * Membaca daftar wilayah: peran yang boleh dibatasi di route (Staf
     * SIDUTama, Kasi Pemerintahan, Kaur TU & Umum); menulis tetap lewat
     * villageId() yang khusus Staf SIDUTama.
     */
    private function readableVillageId(User $user): string
    {
        if (! $user->is_active || ! $user->village_id) {
            abort(403, 'Akun aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }

    /**
     * Dua permintaan bersamaan dengan nomor sama sama-sama lolos validasi;
     * unique index menolak yang kedua dan dijawab 422, bukan 500. Ditulis di
     * dalam transaksi supaya kegagalannya tidak membatalkan transaksi luar
     * (PostgreSQL).
     *
     * @template T
     *
     * @param  callable(): T  $write
     * @return T
     */
    private function guardDuplicateNumber(callable $write): mixed
    {
        try {
            return DB::transaction($write);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['number' => ['RT dengan nomor ini sudah ada di RW tersebut.']]);
        }
    }

    private function villageId(User $user): string
    {
        if ($user->role !== 'staf_sid' || ! $user->is_active || ! $user->village_id) {
            abort(403, UserRole::stafSidLabel().' aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
