<?php

namespace App\Repositories;

use App\Models\Family;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Schema;

class FamilyRepository
{
    public function __construct()
    {
        //
    }

    public function allWithWilayah(): Collection
    {
        return Family::query()
            ->with([
                'rt',
                'rw',
                'hamlet',
                'village',
                'headOfFamily',
            ])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function findById(int $id): ?Family
    {
        return Family::query()
            ->with(array_filter([
                'rt',
                'rw',
                'hamlet',
                'village',
                'headOfFamily',
                Schema::hasColumn('citizens', 'family_id') ? 'members' : null,
            ]))
            ->find($id);
    }

    public function findByNoKkHash(string $noKkHash): ?Family
    {
        return Family::query()->where('no_kk_hash', $noKkHash)->first();
    }

    public function create(array $data): Family
    {
        return Family::create($data);
    }

    public function update(Family $family, array $data): Family
    {
        $family->update($data);

        return $family;
    }

    public function delete(Family $family): bool
    {
        return $family->delete();
    }

    public function existsByHamlet(int $hamletId): bool
    {
        return Family::query()->where('hamlet_id', $hamletId)->exists();
    }

    public function existsByRw(int $rwId): bool
    {
        return Family::query()->where('rw_id', $rwId)->exists();
    }

    public function existsByRt(int $rtId): bool
    {
        return Family::query()->where('rt_id', $rtId)->exists();
    }
}
