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

    public function findActiveByPositionAndVillage(string $position, int $villageId): ?Official
    {
        return Official::query()
            ->where('position', $position)
            ->where('village_id', $villageId)
            ->where('is_active', true)
            ->first();
    }

    public function allActiveByPositionsAndVillage(array $positions, int $villageId): Collection
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
