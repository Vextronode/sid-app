<?php

namespace App\Models;

use App\Enums\DisasterAlertLevel;
use App\Enums\DisasterAlertStatus;
use App\Enums\DisasterAlertType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Peringatan bencana dari SIGAP. Tampil di halaman publik selama belum
 * diakhiri SIGAP, belum diturunkan staf, dan belum lewat `expires_at`.
 * Lihat DisasterAlertService.
 *
 * @property-read DisasterAlertStatus $status
 */
class DisasterAlert extends Model
{
    use HasFactory, HasUuids;

    /** Format `external_id` dari SIGAP (dipakai di route), maks. 100 karakter. */
    public const EXTERNAL_ID_PATTERN = '[A-Za-z0-9._:-]{1,100}';

    protected $fillable = [
        'village_id',
        'integration_client_id',
        'external_id',
        'type',
        'level',
        'level_rank',
        'title',
        'message',
        'magnitude',
        'depth_km',
        'location',
        'link_url',
        'occurred_at',
        'sent_at',
        'expires_at',
        'ended_at',
        'dismissed_at',
        'dismissed_by',
        'dismiss_reason',
        'notified_level_rank',
        'notified_magnitude',
    ];

    protected function casts(): array
    {
        return [
            'type' => DisasterAlertType::class,
            'level' => DisasterAlertLevel::class,
            'level_rank' => 'integer',
            'notified_level_rank' => 'integer',
            'notified_magnitude' => 'float',
            'magnitude' => 'float',
            'depth_km' => 'float',
            'occurred_at' => 'datetime',
            'sent_at' => 'datetime',
            'expires_at' => 'datetime',
            'ended_at' => 'datetime',
            'dismissed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Village, $this> */
    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }

    /** @return BelongsTo<IntegrationClient, $this> */
    public function integrationClient(): BelongsTo
    {
        return $this->belongsTo(IntegrationClient::class);
    }

    /** @return BelongsTo<User, $this> */
    public function dismissedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dismissed_by');
    }

    /**
     * Peringatan yang sedang tampil di halaman publik.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeDisplayed(Builder $query): Builder
    {
        return $query->whereNull('ended_at')
            ->whereNull('dismissed_at')
            ->where('expires_at', '>', now());
    }

    public function isDisplayed(): bool
    {
        return $this->status === DisasterAlertStatus::Active;
    }

    /**
     * Isi peringatan layak dikirim (lagi) sebagai notifikasi, tanpa melihat
     * apakah sedang tampil: belum pernah dikirim, levelnya naik melewati
     * level tertinggi yang pernah dikirim, atau magnitudonya naik minimal
     * `disaster_alerts.magnitude_renotify_delta` dari patokan (gempa
     * susulan yang jauh lebih besar). Magnitudo kosong, atau patokan yang
     * masih kosong, tidak dihitung sebagai naik.
     */
    public function hasEscalated(): bool
    {
        if ($this->notified_level_rank === null || $this->level_rank > $this->notified_level_rank) {
            return true;
        }

        if ($this->magnitude === null || $this->notified_magnitude === null) {
            return false;
        }

        // Dibandingkan dalam persepuluhan supaya 6.0 - 5.0 tidak meleset
        // karena pembulatan float.
        $delta = (int) round((float) config('disaster_alerts.magnitude_renotify_delta', 1.0) * 10);

        return (int) round($this->magnitude * 10) - (int) round($this->notified_magnitude * 10) >= $delta;
    }

    /** Sedang tampil dan layak dikirim sebagai notifikasi. */
    public function needsNotification(): bool
    {
        return $this->isDisplayed() && $this->hasEscalated();
    }

    /**
     * Dihitung ulang setiap dibaca: status berubah karena waktu dan karena
     * update di model yang sama (Laravel menyimpan hasil accessor berupa
     * objek bila tidak dimatikan).
     *
     * @return Attribute<DisasterAlertStatus, never>
     */
    protected function status(): Attribute
    {
        return Attribute::get(fn (): DisasterAlertStatus => match (true) {
            $this->ended_at !== null => DisasterAlertStatus::Ended,
            $this->dismissed_at !== null => DisasterAlertStatus::Dismissed,
            $this->expires_at === null || ! $this->expires_at->isFuture() => DisasterAlertStatus::Expired,
            default => DisasterAlertStatus::Active,
        })->withoutObjectCaching();
    }
}
