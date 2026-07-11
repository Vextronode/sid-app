<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Hamlet extends Model
{
    protected $fillable = [
        'name',
        'village_id',
        'code',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function village()
    {
        return $this->belongsTo(Village::class);
    }

    public function rws()
    {
        return $this->hasMany(Rw::class);
    }

    public function rts()
    {
        return $this->hasMany(Rt::class);
    }
}
