<?php

namespace App\Repositories;

use App\Models\Rt;
use Illuminate\Database\Eloquent\Collection;

class RtRepository
{
    public function __construct()
    {
        //
    }

    public function allOrderedByNumber(string $villageId, ?int $rwId = null): Collection
    {
        $query = Rt::query()->where('village_id', $villageId);

        if ($rwId !== null) {
            $query->where('rw_id', $rwId);
        }

        return $query->orderBy('number')->get();
    }

    public function create(array $data): Rt
    {
        return Rt::create($data);
    }

    public function update(Rt $rt, array $data): Rt
    {
        $rt->update($data);

        return $rt;
    }

    public function delete(Rt $rt): bool
    {
        return $rt->delete();
    }
}
