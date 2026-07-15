<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Rw extends Model
{
    protected $fillable = [
        'number',
        'hamlet_id',
        'full_label',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function hamlet(): belongsTo
    {
        return $this->belongsTo(Hamlet::class);
    }

    public function rts(): HasMany
    {
        return $this->hasMany(Rt::class);
    }
}
