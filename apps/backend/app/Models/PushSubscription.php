<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Minishlink\WebPush\ContentEncoding;
use NotificationChannels\WebPush\PushSubscription as BasePushSubscription;

/**
 * Langganan Web Push satu perangkat/browser. Turunan model package
 * (didaftarkan lewat config webpush.model) agar kolom pemantauan punya
 * cast dan status kesehatan bisa dihitung di satu tempat.
 *
 * Status (lihat statusAt):
 * - aktif: push terakhir berhasil dalam ACTIVE_DAYS hari dan tidak ada
 *   kegagalan sesudahnya;
 * - belum_teruji: belum pernah ada push yang berhasil maupun gagal;
 * - perlu_dicek: selain itu (lama tidak berhasil atau gagal terakhir).
 *
 * Langganan yang kedaluwarsa permanen (404/410) dihapus package saat
 * push dikirim, sehingga tidak pernah muncul dengan status apa pun.
 */
class PushSubscription extends BasePushSubscription
{
    public const ACTIVE_DAYS = 30;

    public const STATUS_ACTIVE = 'aktif';

    public const STATUS_NEEDS_CHECK = 'perlu_dicek';

    public const STATUS_UNTESTED = 'belum_teruji';

    public const STATUSES = [self::STATUS_ACTIVE, self::STATUS_NEEDS_CHECK, self::STATUS_UNTESTED];

    /** Layanan push yang dikenali dari host endpoint. */
    public const SERVICE_HOSTS = [
        'fcm' => ['fcm.googleapis.com', 'android.googleapis.com'],
        'mozilla' => ['push.services.mozilla.com'],
        'apple' => ['push.apple.com'],
        'windows' => ['notify.windows.com'],
    ];

    public const SERVICES = ['fcm', 'mozilla', 'apple', 'windows', 'lainnya'];

    // Menimpa $casts package, jadi cast content_encoding bawaannya diulang.
    protected $casts = [
        'content_encoding' => ContentEncoding::class,
        'last_success_at' => 'datetime',
        'last_failed_at' => 'datetime',
    ];

    public static function activeCutoff(): CarbonInterface
    {
        return now()->subDays(self::ACTIVE_DAYS);
    }

    public function status(): string
    {
        if ($this->last_success_at === null && $this->last_failed_at === null) {
            return self::STATUS_UNTESTED;
        }

        $failedAfterSuccess = $this->last_failed_at !== null
            && ($this->last_success_at === null || $this->last_failed_at->gt($this->last_success_at));

        if ($this->last_success_at !== null
            && $this->last_success_at->gte(self::activeCutoff())
            && ! $failedAfterSuccess) {
            return self::STATUS_ACTIVE;
        }

        return self::STATUS_NEEDS_CHECK;
    }

    /** Layanan push dari host endpoint: fcm, mozilla, apple, windows, atau lainnya. */
    public function pushService(): string
    {
        $host = strtolower((string) parse_url((string) $this->endpoint, PHP_URL_HOST));

        foreach (self::SERVICE_HOSTS as $service => $suffixes) {
            foreach ($suffixes as $suffix) {
                if ($host === $suffix || str_ends_with($host, '.'.$suffix)) {
                    return $service;
                }
            }
        }

        return 'lainnya';
    }

    /**
     * Batasi ke langganan berstatus tertentu (kebalikan dari status()).
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeWithStatus(Builder $query, string $status): Builder
    {
        $cutoff = self::activeCutoff();

        $active = fn (Builder $q) => $q
            ->whereNotNull('last_success_at')
            ->where('last_success_at', '>=', $cutoff)
            ->where(fn (Builder $failed) => $failed
                ->whereNull('last_failed_at')
                ->orWhereColumn('last_failed_at', '<=', 'last_success_at'));

        return match ($status) {
            self::STATUS_UNTESTED => $query->whereNull('last_success_at')->whereNull('last_failed_at'),
            self::STATUS_ACTIVE => $query->where($active),
            default => $query
                ->where(fn (Builder $q) => $q->whereNotNull('last_success_at')->orWhereNotNull('last_failed_at'))
                ->whereNot($active),
        };
    }

    /**
     * Batasi ke layanan push tertentu (dicocokkan dari host endpoint).
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeWithPushService(Builder $query, string $service): Builder
    {
        $matchesHost = function (Builder $q, array $suffixes): void {
            foreach ($suffixes as $suffix) {
                // Endpoint berbentuk https://<host>/..., cocokkan host persis
                // atau subdomainnya.
                $q->orWhere('endpoint', 'like', 'https://'.$suffix.'/%')
                    ->orWhere('endpoint', 'like', 'https://%.'.$suffix.'/%');
            }
        };

        if ($service === 'lainnya') {
            $known = array_merge(...array_values(self::SERVICE_HOSTS));

            return $query->whereNot(fn (Builder $q) => $matchesHost($q, $known));
        }

        return $query->where(fn (Builder $q) => $matchesHost($q, self::SERVICE_HOSTS[$service] ?? []));
    }
}
