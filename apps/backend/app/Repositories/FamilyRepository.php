<?php

namespace App\Repositories;

use App\Models\Family;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Schema;

class FamilyRepository
{
    public function __construct()
    {
        //
    }

    public const DEFAULT_PER_PAGE = 10;

    /**
     * Daftar KK berhalaman. No. KK terenkripsi sehingga tidak bisa dicari
     * sebagian: 16 digit dicocokkan lewat no_kk_hash, teks lain dicari di
     * nama kepala keluarga. Filter Dusun/RW dibaca lewat RT KK (seperti
     * daftar warga), bukan kolom rw_id/hamlet_id yang bisa tidak sinkron.
     *
     * @param  array{search?: ?string, hamlet_id?: int|string|null, rw_id?: int|string|null, rt_id?: int|string|null, per_page?: int|string|null}  $filters
     */
    public function paginateWithWilayah(string $villageId, array $filters = []): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));

        return Family::query()
            ->where('village_id', $villageId)
            ->when($search !== '', function ($query) use ($search) {
                if (preg_match('/^\d{16}$/', $search)) {
                    return $query->where('no_kk_hash', hash('sha256', $search));
                }

                $pattern = '%'.addcslashes(mb_strtolower($search), '\\%_').'%';
                $byName = fn ($citizen) => $citizen->whereRaw('LOWER(name) LIKE ?', [$pattern]);

                return $query->whereHas('headMember', $byName);
            })
            ->when(! empty($filters['hamlet_id']), fn ($query) => $query->whereHas(
                'rt.rw',
                fn ($rwQuery) => $rwQuery->where('hamlet_id', $filters['hamlet_id']),
            ))
            ->when(! empty($filters['rw_id']), fn ($query) => $query->whereHas(
                'rt',
                fn ($rtQuery) => $rtQuery->where('rw_id', $filters['rw_id']),
            ))
            ->when(! empty($filters['rt_id']), fn ($query) => $query->where('rt_id', $filters['rt_id']))
            ->withCount('members')
            ->with([
                'rt',
                'rw',
                'hamlet',
                'village',
                'headMember',
            ])
            ->orderBy('created_at', 'desc')
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? self::DEFAULT_PER_PAGE));
    }

    /**
     * Semua KK desa untuk pilihan KK di form warga (tanpa halaman).
     */
    public function optionsForVillage(string $villageId): Collection
    {
        return Family::query()
            ->where('village_id', $villageId)
            ->with('headMember')
            ->orderBy('created_at', 'desc')
            ->orderBy('id')
            ->get();
    }

    public function findById(string $id, string $villageId): ?Family
    {
        return Family::query()
            ->with(array_filter([
                'rt',
                'rw',
                'hamlet',
                'village',
                'headMember',
                Schema::hasColumn('citizens', 'family_id') ? 'members' : null,
            ]))
            ->where('village_id', $villageId)
            ->find($id);
    }

    public function findForVillageOrFail(string $id, string $villageId): Family
    {
        return Family::query()->where('village_id', $villageId)->findOrFail($id);
    }

    public function findByNoKkHash(string $noKkHash): ?Family
    {
        return Family::query()->where('no_kk_hash', $noKkHash)->first();
    }

    public function create(array $data): Family
    {
        return Family::create($data);
    }

    public function update(Family $family, array $data): Family
    {
        $family->update($data);

        return $family;
    }

    public function delete(Family $family): bool
    {
        return $family->delete();
    }

    public function hasMembers(Family $family): bool
    {
        return Schema::hasColumn('citizens', 'family_id')
            && $family->members()->exists();
    }

    public function existsByHamlet(int $hamletId): bool
    {
        return Family::query()->where('hamlet_id', $hamletId)->exists();
    }

    public function existsByRw(int $rwId): bool
    {
        return Family::query()->where('rw_id', $rwId)->exists();
    }

    public function existsByRt(int $rtId): bool
    {
        return Family::query()->where('rt_id', $rtId)->exists();
    }
}
