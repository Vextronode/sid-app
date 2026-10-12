<?php

namespace App\Models;

use Database\Factories\OccupationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Occupation extends Model
{
    /** @use HasFactory<OccupationFactory> */
    use HasFactory;

    protected $fillable = [
        'village_id',
        'name',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }

    public function citizens(): HasMany
    {
        return $this->hasMany(Citizen::class);
    }
}
