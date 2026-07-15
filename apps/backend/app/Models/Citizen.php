<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Model;
use App\Enums\Religion;
use App\Enums\LastEducation;
use App\Enums\DomicileStatus;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Citizen extends Model
{
    protected $fillable = [
        'village_id',
        'nik',
        'nik_hash',
        'name',
        'date_of_birth',
        'place_of_birth',
        'gender',
        'address',
        'rt_id',
        'hamlet_id',
        'no_kk',
        'marital_status',
        'occupation',
        'religion',
        'last_education',
        'domicile_status',
        'current_domicile',
        'is_active',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'is_active' => 'boolean',
        'religion' => Religion::class,
        'last_education' => LastEducation::class,
        'domicile_status' => DomicileStatus::class,
    ];

   public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }

    public function rt(): BelongsTo
    {
        return $this->belongsTo(Rt::class);
    }

    public function hamlet(): BelongsTo
    {
        return $this->belongsTo(Hamlet::class);
    }

    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }

    public function officials(): HasMany
    {
        return $this->hasMany(Official::class);
    }
    
}
