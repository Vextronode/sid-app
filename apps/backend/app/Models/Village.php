<?php

namespace App\Models;

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

    public function hamlets()
    {
        return $this->hasMany(Hamlet::class);
    }
    public function users()
    {
        return $this->hasMany(User::class);
    }
    public function citizen()
    {
        return $this->hasMany(Citizen::class);
    }
    public function news()
    {
        return $this->hasMany(News::class);
    }
    public function letters()
    {
        return $this->hasMany(Letter::class);
    }
    public function VillageRegulations()
    {
        return $this->hasMany(VillageRegulation::class);
    }
}
