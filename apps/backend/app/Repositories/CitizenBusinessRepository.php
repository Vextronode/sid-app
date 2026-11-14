<?php

namespace App\Repositories;

use App\Models\CitizenBusiness;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class CitizenBusinessRepository
{
    public const DEFAULT_PER_PAGE = 20;

    /** Nilai filter `cimart_status` untuk usaha yang belum pernah didaftarkan. */
    public const CIMART_NOT_REGISTERED = 'none';

    /**
     * Data usaha satu desa, berpaginasi. Pencarian di nama usaha dan nama
     * warga; status surat dibaca dari `letters.expires_at` (tanpa tanggal
     * = berlaku), sama dengan Letter::isExpired().
     *
     * @param  array{search?: ?string, category?: ?string, letter_status?: ?string, cimart_status?: ?string, per_page?: int|string|null}  $filters
     */
    public function paginateForVillage(string $villageId, array $filters = []): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $cimartStatus = $filters['cimart_status'] ?? null;
        $letterStatus = $filters['letter_status'] ?? null;

        return CitizenBusiness::query()
            ->where('village_id', $villageId)
            ->when($search !== '', function ($query) use ($search) {
                $term = '%'.addcslashes(mb_strtolower($search), '\\%_').'%';

                $query->where(fn ($inner) => $inner
                    ->whereRaw('LOWER(business_name) LIKE ?', [$term])
                    ->orWhereHas('citizen', fn ($citizen) => $citizen->whereRaw('LOWER(name) LIKE ?', [$term])));
            })
            ->when(! empty($filters['category']), fn ($query) => $query->where('category', $filters['category']))
            ->when($cimartStatus === self::CIMART_NOT_REGISTERED, fn ($query) => $query->whereNull('cimart_status'))
            ->when(
                $cimartStatus !== null && $cimartStatus !== self::CIMART_NOT_REGISTERED,
                fn ($query) => $query->where('cimart_status', $cimartStatus),
            )
            ->when($letterStatus === 'berlaku', fn ($query) => $query->whereHas(
                'letter',
                fn ($letter) => $letter->where(fn ($inner) => $inner
                    ->whereNull('expires_at')
                    ->orWhere('expires_at', '>=', now())),
            ))
            ->when($letterStatus === 'kedaluwarsa', fn ($query) => $query->whereHas(
                'letter',
                fn ($letter) => $letter->where('expires_at', '<', now()),
            ))
            ->with(['citizen:id,name', 'letter:id,letter_number,expires_at'])
            ->latest()
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? self::DEFAULT_PER_PAGE));
    }

    /** @return Collection<int, CitizenBusiness> */
    public function allForCitizen(string $citizenId): Collection
    {
        return CitizenBusiness::query()
            ->where('citizen_id', $citizenId)
            ->with('letter:id,letter_number,expires_at')
            ->latest()
            ->orderBy('id')
            ->get();
    }
}
