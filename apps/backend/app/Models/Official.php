<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Official extends Model
{
    use HasFactory;

    protected $fillable = [
        'citizen_id',
        'user_id',
        'position',
        'village_id',
        'rt_id',
        'rw_id',
        'hamlet_id',
        'signature_img',
        'stamp_img',
        'photo_img',
        'phone_wa',
        'started_at',
        'ended_at',
        'term_ends_at',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'started_at' => 'date',
        'ended_at' => 'date',
        'term_ends_at' => 'date',
        'is_active' => 'boolean',
    ];

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeTermExpired(Builder $query): Builder
    {
        return $query->active()
            ->whereNotNull('term_ends_at')
            ->whereDate('term_ends_at', '<', today());
    }

    public function scopeTermEndingWithin(Builder $query, int $days): Builder
    {
        return $query->active()
            ->whereNotNull('term_ends_at')
            ->whereBetween('term_ends_at', [today(), today()->addDays($days)]);
    }

    public function citizen(): BelongsTo
    {
        return $this->belongsTo(Citizen::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }

    public function hamlet(): BelongsTo
    {
        return $this->belongsTo(Hamlet::class);
    }

    public function rw(): BelongsTo
    {
        return $this->belongsTo(Rw::class);
    }

    public function rt(): BelongsTo
    {
        return $this->belongsTo(Rt::class);
    }
}
