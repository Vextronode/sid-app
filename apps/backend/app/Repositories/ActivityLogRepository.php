<?php

namespace App\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Activity;

class ActivityLogRepository
{
    public const POPULATION_LOG_NAMES = ['citizen', 'family'];

    /**
     * Riwayat data kependudukan satu desa (S-05). Desa disimpan di
     * properties karena subjek bisa sudah dihapus.
     *
     * @param  array{type?: string|null, event?: string|null, subject_id?: string|null, from?: string|null, to?: string|null}  $filters
     */
    public function paginatePopulation(string $villageId, array $filters, int $perPage): LengthAwarePaginator
    {
        return Activity::query()
            ->whereIn('log_name', isset($filters['type']) ? [$filters['type']] : self::POPULATION_LOG_NAMES)
            ->where('properties->village_id', $villageId)
            ->when($filters['event'] ?? null, fn ($query, $event) => $query->where('event', $event))
            ->when($filters['subject_id'] ?? null, fn ($query, $subjectId) => $query->where('subject_id', $subjectId))
            ->when($filters['from'] ?? null, fn ($query, $from) => $query->where('created_at', '>=', Carbon::parse($from)->startOfDay()))
            ->when($filters['to'] ?? null, fn ($query, $to) => $query->where('created_at', '<=', Carbon::parse($to)->endOfDay()))
            ->with('causer:id,name,role')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);
    }
}
