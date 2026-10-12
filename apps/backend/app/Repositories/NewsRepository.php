<?php

namespace App\Repositories;

use App\Models\News;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class NewsRepository
{
    public function allForVillage(string $villageId, ?string $status): Collection
    {
        $query = News::query()->with(['author', 'categories'])->where('village_id', $villageId)->latest();

        if ($status === 'draft') {
            $query->where('is_published', false);
        } elseif ($status === 'published') {
            $query->where('is_published', true);
        }

        return $query->get();
    }

    /**
     * Berita published terbaru untuk beranda publik; dibatasi di SQL agar
     * tidak memuat seluruh berita hanya untuk menampilkan beberapa.
     */
    public function latestPublishedForVillage(string $villageId, int $limit): Collection
    {
        return News::query()
            ->with(['author', 'categories'])
            ->where('village_id', $villageId)
            ->where('is_published', true)
            ->latest()
            ->limit($limit)
            ->get();
    }

    /**
     * UC-16. Halaman publik /public/news - hanya berita published,
     * dipaginasi (beda dengan allForVillage() yang dipakai admin, selalu
     * kembalikan seluruh baris tanpa pagination).
     */
    public function paginatePublishedForVillage(string $villageId, int $perPage = 10): LengthAwarePaginator
    {
        return News::query()
            ->with(['author', 'categories'])
            ->where('village_id', $villageId)
            ->where('is_published', true)
            ->latest('published_at')
            ->paginate($perPage);
    }

    public function findByIdOrFail(int $id): News
    {
        return News::query()->with(['author', 'categories'])->findOrFail($id);
    }

    public function findByIdForVillageOrFail(int $id, string $villageId): News
    {
        return News::query()->with(['author', 'categories'])->where('village_id', $villageId)->findOrFail($id);
    }

    public function slugExists(string $slug): bool
    {
        return News::query()->where('slug', $slug)->exists();
    }

    public function create(array $data): News
    {
        return News::create($data);
    }

    public function update(News $news, array $data): News
    {
        $news->update($data);

        return $news;
    }

    /**
     * @param  array<int, int>  $categoryIds
     */
    public function syncCategories(News $news, array $categoryIds): void
    {
        $news->categories()->sync($categoryIds);
    }

    public function delete(News $news): void
    {
        $news->delete();
    }
}
