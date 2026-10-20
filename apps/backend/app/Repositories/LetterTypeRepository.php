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

    public function findOrFail(int $id, ?string $villageId = null): LetterType
    {
        return LetterType::query()->when($villageId !== null, fn ($query) => $query->where('village_id', $villageId))->findOrFail($id);
    }

    public function update(LetterType $letterType, array $data): LetterType
    {
        $letterType->update($data);

        return $letterType->load('flow');
    }

    /**
     * @param  array<int, int|string>  $ids
     * @return array<int, string> nama tipe surat berkunci id
     */
    public function namesByIds(array $ids): array
    {
        return LetterType::query()->whereKey($ids)->pluck('name', 'id')->all();
    }

    public function countActiveWithTemplate(string $villageId): int
    {
        return LetterType::query()
            ->where('village_id', $villageId)
            ->whereNotNull('template')
            ->where('is_active', true)
            ->count();
    }

    public function allForVillage(string $villageId): Collection
    {
        return LetterType::query()
            ->where('village_id', $villageId)
            ->orderBy('name')
            ->get();
    }

    public function allActiveWithTemplate(?string $villageId = null): Collection
    {
        return LetterType::query()
            ->when($villageId !== null, fn ($query) => $query->where('village_id', $villageId))
            ->whereNotNull('template')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
    }
}
