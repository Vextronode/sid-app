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

    public function allOrderedByNumber(?int $hamletId = null): Collection
    {
        $query = Rw::query();

        if ($hamletId !== null) {
            $query->where('hamlet_id', $hamletId);
        }

        return $query->orderBy('number')->get();
    }

    public function create(array $data): Rw
    {
        return Rw::create($data);
    }

    public function findOrFail(int $id): Rw
    {
        return Rw::query()->findOrFail($id);
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
