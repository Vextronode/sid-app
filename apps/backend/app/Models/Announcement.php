<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Announcement extends Model
{
    protected $fillable = [
        'village_id',
        'title',
        'body',
        'link_url',
        'expires_at',
        'created_by',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    /**
     * Belum lewat waktu tayang. Baris kedaluwarsa dihapus terjadwal, tapi
     * pembacaan tetap memakai scope ini agar tidak bergantung pada scheduler.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('expires_at', '>', now());
    }

    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }
}
