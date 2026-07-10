<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Enums\Religion;
use App\Enums\LastEducation;
use App\Enums\DomicileStatus;

class Citizen extends Model
{
    protected $fillable = [
        'rt_id',
        'hamlet_id',
        'nik',
        'name',
        'religion',
        'last_education',
        'domicile_status',
    ];

    protected $casts = [
        'religion' => Religion::class,
        'last_education' => LastEducation::class,
        'domicile_status' => DomicileStatus::class,
    ];

    public function hamlet()
    {
        return $this->belongsTo(Hamlet::class);
    }

    public function rt()
    {
        return $this->belongsTo(Rt::class);
    }

    public function user()
    {
        return $this->hasOne(User::class);
    }
    
}
