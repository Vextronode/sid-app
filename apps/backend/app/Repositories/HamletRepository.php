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
