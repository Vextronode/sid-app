<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VillageInfoPage extends Model
{
    protected $fillable = [
        'village_id',
        'page',
        'fields',
    ];

    protected $casts = [
        'fields' => 'array',
    ];

    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }
}
