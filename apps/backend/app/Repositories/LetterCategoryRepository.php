<?php

namespace app\Repositories;

use app\Models\LetterCategory;
use Illuminate\Database\Eloquent\Collection;

class LetterCategoryRepository
{
    public function findByCode(string $code): ?LetterCategory
    {
        return LetterCategory::query()->where('code', $code)->first();
    }

    public function findAllActive(): Collection
    {
        return LetterCategory::query()->where('is_active', true)->get();
    }

    public function all(): Collection
    {
        return LetterCategory::query()->orderBy('id')->get();
    }
}
