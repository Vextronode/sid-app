<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\News;
use App\Models\User;
use App\Repositories\NewsRepository;
use App\Support\PublicPageCache;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

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

        $newThumbnail = $this->storeThumbnail($data);
        if ($newThumbnail !== null) {
            $payload['thumbnail'] = $newThumbnail;
        }

        $news = $this->writeWithThumbnail($newThumbnail, fn () => DB::transaction(function () use ($payload, $data) {
            $news = $this->repository->create($payload);
            $this->repository->syncCategories($news, $data['category_ids']);

            return $news;
        }));

        $this->flushPublicCache($news);

        return $news->load(['author', 'categories']);
    }

    public function update(int $id, array $data, User $user): News
    {
        $news = $this->repository->findByIdForVillageOrFail($id, $this->villageId($user));

        $payload = array_intersect_key(
            $data,
            array_flip(['title', 'content'])
        );

        $oldThumbnail = $news->thumbnail;
        $newThumbnail = $this->storeThumbnail($data);
        if ($newThumbnail !== null) {
            $payload['thumbnail'] = $newThumbnail;
        }

        if (array_key_exists('is_published', $data)) {
            $payload['is_published'] = $data['is_published'];

            $payload['published_at'] = $data['is_published']
                ? ($news->published_at ?? now())
                : null;
        }

        $news = $this->writeWithThumbnail($newThumbnail, fn () => DB::transaction(function () use ($news, $payload, $data) {
            $news = $this->repository->update($news, $payload);

            if (array_key_exists('category_ids', $data)) {
                $this->repository->syncCategories($news, $data['category_ids']);
            }

            return $news;
        }));

        // File lama baru dihapus setelah data tersimpan: bila penyimpanan
        // gagal, berita tetap menunjuk file lama yang masih ada.
        if ($newThumbnail !== null && $oldThumbnail) {
            DB::afterCommit(fn () => Storage::disk('public')->delete($oldThumbnail));
        }

        $this->flushPublicCache($news);

        return $news->load('categories');
    }

    public function delete(int $id, User $user): void
    {
        $news = $this->repository->findByIdForVillageOrFail($id, $this->villageId($user));

        $this->repository->delete($news);
    }

    private function storeThumbnail(array $data): ?string
    {
        return isset($data['thumbnail']) && $data['thumbnail'] instanceof UploadedFile
            ? $data['thumbnail']->store('news', 'public')
            : null;
    }

    /**
     * Jalankan penulisan data; bila gagal, thumbnail baru yang sudah
     * terunggah dihapus supaya tidak tertinggal tanpa berita.
     *
     * @template T
     *
     * @param  callable(): T  $write
     * @return T
     */
    private function writeWithThumbnail(?string $newThumbnail, callable $write): mixed
    {
        try {
            return $write();
        } catch (Throwable $exception) {
            if ($newThumbnail !== null) {
                Storage::disk('public')->delete($newThumbnail);
            }

            throw $exception;
        }
    }

    /**
     * sync() kategori tidak memicu event saved milik News, jadi cache
     * halaman publik digugurkan lagi setelah transaksi selesai.
     */
    private function flushPublicCache(News $news): void
    {
        PublicPageCache::flush($news->village_id);
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

    private function villageId(User $user): string
    {
        if ($user->role !== 'staf_sid' || ! $user->is_active || ! $user->village_id) {
            abort(403, UserRole::stafSidLabel().' aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
