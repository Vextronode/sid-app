<?php

namespace App\Services;

use App\Models\News;
use App\Models\User;
use App\Repositories\NewsRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class NewsService
{
    public function __construct(
        private readonly NewsRepository $repository,
    ) {}

    public function list(User $user, ?string $status): Collection
    {
        return $this->repository->allForVillage($user->village_id, $status);
    }

    public function create(User $user, array $data): News
    {
        $isPublished = $data['is_published'] ?? false;

        $payload = [
            'village_id' => $user->village_id,
            'author_id' => $user->id,
            'title' => $data['title'],
            'slug' => $this->generateUniqueSlug($data['title']),
            'content' => $data['content'],
            'is_published' => $isPublished,
            'published_at' => $isPublished ? now() : null,
        ];

        if (isset($data['thumbnail']) && $data['thumbnail'] instanceof UploadedFile) {
            $payload['thumbnail'] = $data['thumbnail']->store('news', 'public');
        }

        return $this->repository->create($payload);
    }

    public function update(int $id, array $data): News
    {
        $news = $this->repository->findByIdOrFail($id);

        $payload = array_intersect_key($data, array_flip(['title', 'content']));

        if (array_key_exists('is_published', $data)) {
            $payload['is_published'] = $data['is_published'];
            $payload['published_at'] = $data['is_published']
                ? ($news->published_at ?? now())
                : null;
        }

        return $this->repository->update($news, $payload);
    }

    public function delete(int $id): void
    {
        $news = $this->repository->findByIdOrFail($id);

        $this->repository->delete($news);
    }

    private function generateUniqueSlug(string $title): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $suffix = 1;

        while ($this->repository->slugExists($slug)) {
            $suffix++;
            $slug = "{$base}-{$suffix}";
        }

        return $slug;
    }
}
