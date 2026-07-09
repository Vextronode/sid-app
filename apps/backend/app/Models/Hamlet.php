<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Hamlet extends Model
{
    protected $fillable = [
        'name',
        'village_id',
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
