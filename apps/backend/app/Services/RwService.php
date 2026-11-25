<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Exceptions\RecordInUseException;
use App\Exceptions\RegionHasActiveCitizensException;
use App\Models\Hamlet;
use App\Models\Rw;
use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Repositories\ReferenceRepository;
use App\Repositories\RwRepository;
use App\Support\PopulationScope;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RwService
{
    public function __construct(
        protected RwRepository $rwRepository,
        protected CitizenRepository $citizenRepository,
        protected ReferenceRepository $referenceRepository,
    ) {}

    public function getAllOrderedByNumber(User $user, ?int $hamletId = null): Collection
    {
        return $this->rwRepository->allOrderedByNumber($this->readableVillageId($user), $hamletId, PopulationScope::for($user));
    }

    public function create(array $data, User $user): Rw
    {
        // Dusun dikirim di isi request: milik desa lain = input salah (422).
        $hamlet = Hamlet::findOrFail($data['hamlet_id']);
        if ($hamlet->village_id !== $this->villageId($user)) {
            throw ValidationException::withMessages(['hamlet_id' => ['Dusun harus berasal dari desa Anda.']]);
        }

        return $this->guardDuplicateNumber(fn () => $this->rwRepository->create([
            'hamlet_id' => $data['hamlet_id'],
            'village_id' => $hamlet->village_id,
            'number' => $data['number'],
            'is_active' => true,
        ]));
    }

    public function update(Rw $rw, array $data, User $user): Rw
    {
        if ($rw->village_id !== $this->villageId($user)) {
            abort(404, 'RW tidak ditemukan.');
        }
        $isDeactivating = array_key_exists('is_active', $data)
            && ! $data['is_active']
            && $rw->is_active;

        if ($isDeactivating && $this->citizenRepository->existsActiveByRw($rw->id)) {
            throw new RegionHasActiveCitizensException('RW');
        }

        return $this->guardDuplicateNumber(fn () => $this->rwRepository->update($rw, $data));
    }

    public function delete(Rw $rw, User $user): bool
    {
        if ($rw->village_id !== $this->villageId($user)) {
            abort(404, 'RW tidak ditemukan.');
        }
        // Termasuk RT di bawahnya, yang ikut terhapus lewat cascade.
        $usedBy = $this->referenceRepository->regionUsedBy($rw);
        if ($usedBy !== []) {
            throw RecordInUseException::region('RW', $usedBy);
        }

        return $this->rwRepository->delete($rw);
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
            throw ValidationException::withMessages(['number' => ['RW dengan nomor ini sudah ada di desa ini.']]);
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
