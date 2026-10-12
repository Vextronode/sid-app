<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rw extends Model
{
    use HasFactory;

    protected $fillable = [
        'number',
        'hamlet_id',
        'village_id',
        'full_label',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function hamlet(): BelongsTo
    {
        return $this->belongsTo(Hamlet::class);
    }

    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }

    public function rts(): HasMany
    {
        return $this->hasMany(Rt::class);
    }
}
