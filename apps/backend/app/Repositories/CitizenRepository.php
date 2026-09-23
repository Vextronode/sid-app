<?php

namespace App\Repositories;

use App\Models\Citizen;
use App\Models\Rt;
use Illuminate\Database\Eloquent\Collection;

class CitizenRepository
{
    public function __construct()
    {
        //
    }

    public function allWithWilayah(): Collection
    {
        return Citizen::query()
            ->with(['rt', 'rw', 'hamlet', 'village'])
            ->orderBy('name')
            ->get();
    }

    public function findByNikHash(string $nikHash): ?Citizen
    {
        return Citizen::query()->where('nik_hash', $nikHash)->first();
    }

    public function findOrFail(int $id): Citizen
    {
        return Citizen::query()->findOrFail($id);
    }

    public function create(array $data): Citizen
    {
        return Citizen::create($data);
    }

    public function update(Citizen $citizen, array $data): Citizen
    {
        $citizen->update($data);

        return $citizen;
    }

    public function findRwIdByRtId(int $rtId): ?int
    {
        return Rt::query()->whereKey($rtId)->value('rw_id');
    }

    public function existsFamilyHead(int $familyId, ?int $excludeCitizenId = null): bool
    {
        return Citizen::query()
            ->where('family_id', $familyId)
            ->where('family_role', 'kepala_keluarga')
            ->where('is_active', true)
            ->when($excludeCitizenId, fn ($q) => $q->where('id', '!=', $excludeCitizenId))
            ->exists();
    }

    public function findByFamilyId(int $familyId): Collection
    {
        return Citizen::query()
            ->with(['rt', 'rw', 'hamlet', 'village'])
            ->where('family_id', $familyId)
            ->orderBy('name')
            ->get();
    }

    public function delete(Citizen $citizen): bool
    {
        return $citizen->delete();
    }

    public function distinctWilayah(): Collection
    {
        return Citizen::query()
            ->with(['rt', 'rw'])
            ->select('rt_id', 'rw_id')
            ->distinct()
            ->get();
    }

    public function existsByHamlet(int $hamletId): bool
    {
        return Citizen::query()->where('hamlet_id', $hamletId)->exists();
    }

    public function existsActiveByHamlet(int $hamletId): bool
    {
        return Citizen::query()
            ->where('hamlet_id', $hamletId)
            ->where('is_active', true)
            ->exists();
    }

    public function existsByRw(int $rwId): bool
    {
        return Citizen::query()->where('rw_id', $rwId)->exists();
    }

    public function existsActiveByRw(int $rwId): bool
    {
        return Citizen::query()
            ->where('rw_id', $rwId)
            ->where('is_active', true)
            ->exists();
    }

    public function existsByRt(int $rtId): bool
    {
        return Citizen::query()->where('rt_id', $rtId)->exists();
    }

    public function existsActiveByRt(int $rtId): bool
    {
        return Citizen::query()
            ->where('rt_id', $rtId)
            ->where('is_active', true)
            ->exists();
    }

    public function countByGender(int $villageId, string $gender, ?int $rtId = null, ?int $rwId = null): int
    {
        $query = Citizen::query()
            ->where('village_id', $villageId)
            ->where('gender', $gender);

        if ($rtId !== null) {
            $query->where('rt_id', $rtId);
        }

        if ($rwId !== null) {
            $query->where('rw_id', $rwId);
        }

        return $query->count();
    }

    public function countActiveByVillage(int $villageId): int
    {
        return Citizen::query()
            ->where('village_id', $villageId)
            ->where('is_active', true)
            ->count();
    }
}
