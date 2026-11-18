<?php

namespace App\Repositories;

use App\Models\MigrantWorker;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class MigrantWorkerRepository
{
    public const DEFAULT_PER_PAGE = 20;

    /** Nilai filter `contract_status`, dihitung dari tanggal kontrak terhadap hari ini. */
    public const CONTRACT_UPCOMING = 'akan_berangkat';

    public const CONTRACT_ACTIVE = 'aktif';

    public const CONTRACT_ENDED = 'berakhir';

    public const CONTRACT_STATUSES = [self::CONTRACT_UPCOMING, self::CONTRACT_ACTIVE, self::CONTRACT_ENDED];

    /**
     * Data CPMI satu desa, berpaginasi, terbaru dulu. Pencarian di nama
     * warga, negara tujuan, pemberi kerja, dan P3MI; dusun dibaca dari
     * wilayah pemohon yang dibekukan di pengajuan (letters.hamlet_id).
     *
     * @param  array{search?: ?string, destination_country?: ?string, contract_status?: ?string, hamlet_id?: ?string, per_page?: int|string|null}  $filters
     */
    public function paginateForVillage(string $villageId, array $filters = []): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $today = now()->toDateString();

        return MigrantWorker::query()
            ->where('village_id', $villageId)
            ->when($search !== '', function (Builder $query) use ($search) {
                $term = '%'.addcslashes(mb_strtolower($search), '\\%_').'%';

                $query->where(fn (Builder $inner) => $inner
                    ->whereRaw('LOWER(destination_country) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(employer_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(agency_name) LIKE ?', [$term])
                    ->orWhereHas('citizen', fn (Builder $citizen) => $citizen->whereRaw('LOWER(name) LIKE ?', [$term])));
            })
            ->when(! empty($filters['destination_country']), fn (Builder $query) => $query->where('destination_country', $filters['destination_country']))
            ->when(! empty($filters['hamlet_id']), fn (Builder $query) => $query->whereHas(
                'letter',
                fn (Builder $letter) => $letter->where('hamlet_id', $filters['hamlet_id']),
            ))
            ->when(($filters['contract_status'] ?? null) === self::CONTRACT_UPCOMING, fn (Builder $query) => $query->where('contract_start', '>', $today))
            ->when(($filters['contract_status'] ?? null) === self::CONTRACT_ACTIVE, fn (Builder $query) => $query
                ->where(fn (Builder $inner) => $inner->whereNull('contract_start')->orWhere('contract_start', '<=', $today))
                ->where(fn (Builder $inner) => $inner->whereNull('contract_end')->orWhere('contract_end', '>=', $today)))
            ->when(($filters['contract_status'] ?? null) === self::CONTRACT_ENDED, fn (Builder $query) => $query->where('contract_end', '<', $today))
            ->with(['citizen:id,name', 'letter:id,hamlet_id,processed_at', 'letter.hamlet:id,name'])
            ->latest()
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? self::DEFAULT_PER_PAGE));
    }

    /**
     * Riwayat CPMI seorang warga, terbaru dulu.
     *
     * @return Collection<int, MigrantWorker>
     */
    public function allForCitizen(string $citizenId): Collection
    {
        return MigrantWorker::query()
            ->where('citizen_id', $citizenId)
            ->with(['citizen:id,name', 'letter:id,hamlet_id,processed_at', 'letter.hamlet:id,name'])
            ->latest()
            ->orderBy('id')
            ->get();
    }

    /** @return array<int, string> */
    public function countriesForVillage(string $villageId): array
    {
        return MigrantWorker::query()
            ->where('village_id', $villageId)
            ->distinct()
            ->orderBy('destination_country')
            ->pluck('destination_country')
            ->all();
    }
}
