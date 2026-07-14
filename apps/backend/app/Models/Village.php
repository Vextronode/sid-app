<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class Village extends Model
{
    protected $fillable = [
        'name',
        'code',
        'head_name',
        'address',
        'phone',
    ];

    public function hamlets(): HasMany
    {
        return $this->hasMany(Hamlet::class);
    }
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
    public function citizens(): HasMany
    {
        return $this->hasMany(Citizen::class);
    }
    public function news(): HasMany
    {
        return $this->hasMany(News::class);
    }
    public function letters(): HasMany
    {
        return $this->hasMany(Letter::class);
    }
    public function VillageRegulations(): HasMany
    {
        return $this->hasMany(VillageRegulation::class);
    }
}
