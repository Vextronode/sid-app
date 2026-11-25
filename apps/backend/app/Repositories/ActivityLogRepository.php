<?php

namespace App\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Activity;

class ActivityLogRepository
{
    public const POPULATION_LOG_NAMES = ['citizen', 'family'];

    /** Tindakan atas akun, keputusan atur ulang kata sandi, dan aktivasi pendaftaran. */
    public const ACCOUNT_LOG_NAMES = ['user', 'password_reset_request', 'account_registration', 'profile_photo_request'];

    /**
     * Tab "Lainnya": pengangkatan pejabat, buka NIK di surat, data usaha
     * (Cimart), peringatan bencana SIGAP, dan akses klien integrasi.
     */
    public const OTHER_LOG_NAMES = ['official', 'letter', 'citizen_business', 'disaster_alert', 'integration'];

    /**
     * Riwayat data kependudukan satu desa (S-05). Desa disimpan di
     * properties karena subjek bisa sudah dihapus.
     *
     * @param  array{type?: string|null, event?: string|null, subject_id?: string|null, from?: string|null, to?: string|null}  $filters
     */
    public function paginatePopulation(string $villageId, array $filters, int $perPage): LengthAwarePaginator
    {
        return $this->villageLogs(isset($filters['type']) ? [$filters['type']] : self::POPULATION_LOG_NAMES, $villageId, $filters)
            ->with('causer:id,name,role')
            ->when($filters['subject_id'] ?? null, fn ($query, $subjectId) => $query->where('subject_id', $subjectId))
            ->paginate($perPage);
    }

    /**
     * Riwayat tindakan atas akun pengguna satu desa.
     *
     * @param  array{event?: string|null, from?: string|null, to?: string|null}  $filters
     */
    public function paginateAccounts(string $villageId, array $filters, int $perPage): LengthAwarePaginator
    {
        return $this->villageLogs(self::ACCOUNT_LOG_NAMES, $villageId, $filters)
            ->with('causer:id,name,role')
            ->paginate($perPage);
    }

    /**
     * Log lain satu desa. Pelakunya bisa pengguna atau klien integrasi
     * (tanpa kolom role), jadi relasi causer dimuat utuh.
     *
     * @param  array{type?: string|null, event?: string|null, from?: string|null, to?: string|null}  $filters
     */
    public function paginateOthers(string $villageId, array $filters, int $perPage): LengthAwarePaginator
    {
        return $this->villageLogs(isset($filters['type']) ? [$filters['type']] : self::OTHER_LOG_NAMES, $villageId, $filters)
            ->with('causer')
            ->paginate($perPage);
    }

    /**
     * @param  list<string>  $logNames
     * @param  array{event?: string|null, from?: string|null, to?: string|null}  $filters
     * @return Builder<Activity>
     */
    private function villageLogs(array $logNames, string $villageId, array $filters): Builder
    {
        return Activity::query()
            ->whereIn('log_name', $logNames)
            ->where('properties->village_id', $villageId)
            ->when($filters['event'] ?? null, fn ($query, $event) => $query->where('event', $event))
            ->when($filters['from'] ?? null, fn ($query, $from) => $query->where('created_at', '>=', Carbon::parse($from)->startOfDay()))
            ->when($filters['to'] ?? null, fn ($query, $to) => $query->where('created_at', '<=', Carbon::parse($to)->endOfDay()))
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }
}
