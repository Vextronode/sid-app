<?php

namespace App\Repositories;

use App\Models\Rw;
use Illuminate\Database\Eloquent\Collection;

class RwRepository
{
    public function __construct()
    {
        //
    }

    public function allOrderedByNumber(string $villageId, ?int $hamletId = null): Collection
    {
        $query = Rw::query()->where('village_id', $villageId);

        if ($hamletId !== null) {
            $query->where('hamlet_id', $hamletId);
        }

        return $query->orderBy('number')->get();
    }

    public function create(array $data): Rw
    {
        return Rw::create($data);
    }

    public function findOrFail(int $id, ?string $villageId = null): Rw
    {
        return Rw::query()->with('hamlet')->when($villageId, fn ($query) => $query->where('village_id', $villageId))->findOrFail($id);
    }

    public function update(Rw $rw, array $data): Rw
    {
        $rw->update($data);

        return $rw;
    }

    public function delete(Rw $rw): bool
    {
        return $rw->delete();
    }
}
