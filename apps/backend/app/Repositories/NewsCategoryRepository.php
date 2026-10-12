<?php

namespace App\Repositories;

use App\Models\NewsCategory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class NewsCategoryRepository
{
    /**
     * news_count ikut menghitung berita soft-deleted, karena kategori yang
     * pernah dipakai tetap tidak boleh dihapus.
     */
    public function allForVillage(string $villageId): Collection
    {
        return NewsCategory::query()
            ->where('village_id', $villageId)
            ->withCount(['news' => fn ($query) => $query->withTrashed()])
            ->orderBy('name')
            ->get();
    }

    public function findByIdForVillageOrFail(int $id, string $villageId): NewsCategory
    {
        return NewsCategory::query()
            ->where('village_id', $villageId)
            ->withCount(['news' => fn ($query) => $query->withTrashed()])
            ->findOrFail($id);
    }

    public function slugExists(string $villageId, string $slug, ?int $exceptId = null): bool
    {
        return NewsCategory::query()
            ->where('village_id', $villageId)
            ->where('slug', $slug)
            ->when($exceptId !== null, fn ($query) => $query->whereKeyNot($exceptId))
            ->exists();
    }

    public function isUsed(NewsCategory $category): bool
    {
        return DB::table('news_category_news')->where('news_category_id', $category->id)->exists();
    }

    public function create(array $data): NewsCategory
    {
        $category = NewsCategory::create($data);
        $category->news_count = 0;

        return $category;
    }

    public function update(NewsCategory $category, array $data): NewsCategory
    {
        $category->update($data);

        return $category;
    }

    public function delete(NewsCategory $category): void
    {
        $category->delete();
    }
}
