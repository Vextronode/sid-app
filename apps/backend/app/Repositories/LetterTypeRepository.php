<?php

namespace App\Repositories;

use App\Models\LetterType;
use Illuminate\Database\Eloquent\Collection;

class LetterTypeRepository
{
    public function __construct()
    {
        //
    }

    public function findOrFail(int $id): LetterType
    {
        return LetterType::query()->findOrFail($id);
    }

    public function update(LetterType $letterType, array $data): LetterType
    {
        $letterType->update($data);

        return $letterType->load(['category', 'flow']);
    }

    public function allActiveWithTemplate(): Collection
    {
        return LetterType::query()
            ->whereNotNull('template')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
    }
}
