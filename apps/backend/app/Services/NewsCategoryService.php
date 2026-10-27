<?php

namespace App\Services;

use App\Models\NewsCategory;
use App\Models\User;
use App\Repositories\NewsCategoryRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Kategori berita per desa, dikelola Staf SIDUTama. Kategori yang sudah
 * dipakai berita (termasuk berita yang sudah dihapus) tidak bisa dihapus.
 */
class NewsCategoryService
{
    public function __construct(
        private readonly NewsCategoryRepository $repository,
    ) {}

    public function list(User $user): Collection
    {
        return $this->repository->allForVillage($user->village_id);
    }

    public function create(User $user, array $data): NewsCategory
    {
        return $this->repository->create([
            'village_id' => $user->village_id,
            'name' => $data['name'],
            'slug' => $this->uniqueSlug($user->village_id, $data['name']),
        ]);
    }

    public function update(User $user, int $id, array $data): NewsCategory
    {
        $category = $this->repository->findByIdForVillageOrFail($id, $user->village_id);

        return $this->repository->update($category, [
            'name' => $data['name'],
            'slug' => $this->uniqueSlug($user->village_id, $data['name'], $category->id),
        ]);
    }

    public function delete(User $user, int $id): void
    {
        $category = $this->repository->findByIdForVillageOrFail($id, $user->village_id);

        if ($this->repository->isUsed($category)) {
            abort(409, 'Kategori ini sudah dipakai berita sehingga tidak dapat dihapus.');
        }

        $this->repository->delete($category);
    }

    private function uniqueSlug(string $villageId, string $name, ?int $exceptId = null): string
    {
        $slug = Str::limit(Str::slug($name), 60, '');

        if ($slug === '' || $this->repository->slugExists($villageId, $slug, $exceptId)) {
            throw ValidationException::withMessages([
                'name' => 'Nama kategori ini sudah dipakai. Gunakan nama lain.',
            ]);
        }

        return $slug;
    }
}
