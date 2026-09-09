<?php

namespace App\Repositories;

use App\Models\News;
use Illuminate\Database\Eloquent\Collection;

class NewsRepository
{
    public function allForVillage(int $villageId, ?string $status): Collection
    {
        $query = News::query()->with('author')->where('village_id', $villageId)->latest();

        if ($status === 'draft') {
            $query->where('is_published', false);
        } elseif ($status === 'published') {
            $query->where('is_published', true);
        }

        return $query->get();
    }

    public function findByIdOrFail(int $id): News
    {
        return News::query()->with('author')->findOrFail($id);
    }

    public function slugExists(string $slug): bool
    {
        return News::query()->where('slug', $slug)->exists();
    }

    public function create(array $data): News
    {
        return News::create($data)->load('author');
    }

    public function update(News $news, array $data): News
    {
        $news->update($data);

        return $news;
    }

    public function delete(News $news): void
    {
        $news->delete();
    }
}
