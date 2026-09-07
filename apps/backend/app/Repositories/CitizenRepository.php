<?php

namespace App\Repositories;

use App\Models\Citizen;
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
            ->with([
                'rt',
                'rw',
                'hamlet',
                'village',
            ])
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
            ->with([
                'rt',
                'rw',
            ])
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
}
