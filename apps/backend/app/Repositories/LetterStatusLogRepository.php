<?php

namespace App\Repositories;

use App\Models\LetterStatusLog;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;

class LetterStatusLogRepository
{
    public function __construct()
    {
        //
    }

    public function create(array $data): LetterStatusLog
    {
        return LetterStatusLog::create($data);
    }

    /**
     * Seluruh perubahan status surat satu desa untuk halaman Log Aktivitas.
     *
     * @param  array{new_status?: string|null, actor_id?: string|null, from?: string|null, to?: string|null}  $filters
     */
    public function paginateForVillage(string $villageId, array $filters, int $perPage): LengthAwarePaginator
    {
        return LetterStatusLog::query()
            ->whereHas('letter', fn ($query) => $query->where('village_id', $villageId))
            ->when($filters['new_status'] ?? null, fn ($query, $status) => $query->where('new_status', $status))
            ->when($filters['actor_id'] ?? null, fn ($query, $actorId) => $query->where('actor_id', $actorId))
            ->when($filters['from'] ?? null, fn ($query, $from) => $query->where('created_at', '>=', Carbon::parse($from)->startOfDay()))
            ->when($filters['to'] ?? null, fn ($query, $to) => $query->where('created_at', '<=', Carbon::parse($to)->endOfDay()))
            ->with([
                'actor:id,name,role',
                'letter:id,letter_number,applicant_name,letter_type_id',
                'letter.letterType:id,name',
            ])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);
    }
}
