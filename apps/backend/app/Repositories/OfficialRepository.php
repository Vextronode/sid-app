<?php

namespace App\Repositories;

use App\Models\Official;
use Illuminate\Database\Eloquent\Collection;

class OfficialRepository
{
    public function __construct()
    {
        //
    }

    public function allWithRelations(): Collection
    {
        return Official::query()
            ->with([
                'citizen',
                'user',
                'village',
                'hamlet',
                'rt',
                'rw',
            ])
            ->latest()
            ->get();
    }

    public function find(int $id): ?Official
    {
        return Official::query()->find($id);
    }

    public function findOrFail(int $id): Official
    {
        return Official::query()->findOrFail($id);
    }

    public function findWithRelationsOrFail(int $id): Official
    {
        return Official::query()
            ->with([
                'citizen',
                'user',
                'village',
                'hamlet',
                'rt',
                'rw',
            ])
            ->findOrFail($id);
    }

    public function create(array $data): Official
    {
        return Official::create($data);
    }

    public function update(Official $official, array $data): Official
    {
        $official->update($data);

        return $official;
    }

    public function delete(Official $official): bool
    {
        return $official->delete();
    }

    /**
     * Cek apakah masih ada pejabat aktif lain pada posisi & lingkup
     * wilayah yang sama, dipakai saat validasi supaya tidak ada dua
     * pejabat aktif sekaligus untuk satu jabatan di wilayah yang sama.
     * $excludeId dipakai saat update agar record yang sedang diedit
     * tidak menghitung dirinya sendiri.
     */
    public function existsActiveByPositionAndScope(
        string $position,
        ?int $villageId = null,
        ?int $rtId = null,
        ?int $rwId = null,
        ?int $hamletId = null,
        ?int $excludeId = null,
    ): bool {
        $query = Official::query()
            ->where('position', $position)
            ->where('is_active', true);

        if ($villageId !== null) {
            $query->where('village_id', $villageId);
        }

        if ($rtId !== null) {
            $query->where('rt_id', $rtId);
        }

        if ($rwId !== null) {
            $query->where('rw_id', $rwId);
        }

        if ($hamletId !== null) {
            $query->where('hamlet_id', $hamletId);
        }

        if ($excludeId !== null) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    public function findActiveRtByRtId(int $rtId): ?Official
    {
        return Official::query()
            ->where('rt_id', $rtId)
            ->where('position', 'rt')
            ->where('is_active', true)
            ->first();
    }

    public function findActiveRwByRwId(int $rwId): ?Official
    {
        return Official::query()
            ->where('rw_id', $rwId)
            ->where('position', 'rw')
            ->where('is_active', true)
            ->first();
    }

    /**
     * Mencerminkan query asli OfficialService::resolveNextOfficials()
     * case 'rt' — mencari SEMUA official RW aktif di rw_id yang sama
     * (bukan cuma satu), tanpa filter village_id.
     */
    public function allActiveRwByRwId(int $rwId): Collection
    {
        return Official::query()
            ->where('rw_id', $rwId)
            ->where('position', 'rw')
            ->where('is_active', true)
            ->get();
    }

    /**
     * Resolve generik untuk step approval berbasis wilayah (RT). Tidak
     * hardcode ke position 'rt' secara implisit di caller — position
     * tetap diteruskan sebagai parameter agar method ini bisa dipakai
     * kembali bila suatu saat skema approval region-based lain (selain
     * RT) ditambahkan, tanpa perlu method baru.
     *
     * Dipakai oleh OfficialService::resolveNextOfficials() (EV5-4-S1)
     * untuk step FlowStep::isRegionBased() === true.
     */
    public function allActiveByPositionAndRt(string $position, int $rtId): Collection
    {
        return Official::query()
            ->where('rt_id', $rtId)
            ->where('position', $position)
            ->where('is_active', true)
            ->get();
    }

    public function findActiveByPositionAndVillage(string $position, int $villageId): ?Official
    {
        return Official::query()
            ->where('position', $position)
            ->where('village_id', $villageId)
            ->where('is_active', true)
            ->first();
    }

    public function allActiveByPositionsAndVillage(array $positions, ?int $villageId): Collection
    {
        return Official::query()
            ->whereIn('position', $positions)
            ->where('village_id', $villageId)
            ->where('is_active', true)
            ->get();
    }

    public function findActiveVillageHead(): ?Official
    {
        return Official::query()
            ->where('position', 'kepala_desa')
            ->where('is_active', true)
            ->first();
    }

    /**
     * Mencerminkan query asli PdfService::download()/preview() (query
     * yang sama diduplikasi di kedua method tersebut sebelum refactor):
     * kepala desa aktif dengan relasi citizen ter-load dan yang belum
     * berakhir masa jabatannya (ended_at masih null). Dipakai firstOrFail
     * karena kode asli mengharapkan pasti ada kepala desa aktif.
     */
    public function findActiveVillageHeadWithCitizenOrFail(): Official
    {
        return Official::query()
            ->with('citizen')
            ->where('position', 'kepala_desa')
            ->where('is_active', true)
            ->whereNull('ended_at')
            ->firstOrFail();
    }
}
