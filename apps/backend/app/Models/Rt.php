<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rt extends Model
{
    protected $fillable = [
        'number',
        'rw_id',
        'full_label',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function rw()
    {
        return $this->belongsTo(Rw::class);
    }
}
