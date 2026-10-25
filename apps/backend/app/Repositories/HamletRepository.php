<?php

namespace App\Repositories;

use App\Models\Hamlet;
use Illuminate\Database\Eloquent\Collection;

class HamletRepository
{
    public function __construct()
    {
        //
    }

    public function allOrderedByName(string $villageId): Collection
    {
        return Hamlet::query()->where('village_id', $villageId)->orderBy('name')->get();
    }

    /**
     * Dusun aktif beserta RW dan RT aktifnya, untuk pilihan wilayah di form.
     */
    public function activeTree(string $villageId): Collection
    {
        return Hamlet::query()
            ->where('village_id', $villageId)
            ->where('is_active', true)
            ->with([
                'rws' => fn ($query) => $query->where('is_active', true)->orderBy('number'),
                'rws.rts' => fn ($query) => $query->where('is_active', true)->orderBy('number'),
            ])
            ->orderBy('name')
            ->get();
    }

    public function create(array $data): Hamlet
    {
        return Hamlet::create($data);
    }

    public function update(Hamlet $hamlet, array $data): Hamlet
    {
        $hamlet->update($data);

        return $hamlet;
    }

    public function delete(Hamlet $hamlet): bool
    {
        return $hamlet->delete();
    }
}
