<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rw extends Model
{
    protected $fillable = [
        'number',
        'hamlet_id',
    ];

    public function hamlet()
    {
        return $this->belongsTo(Hamlet::class);
    }

    public function rts()
    {
        return $this->hasMany(Rt::class);
    }
}
