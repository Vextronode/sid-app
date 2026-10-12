<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VillageRegulation extends Model
{
    protected $fillable = [
        'village_id',
        'regulation_number',
        'title',
        'content',
        'enacted_date',
        'created_by',
    ];

    protected $casts = [
        'enacted_date' => 'date',
    ];

    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
