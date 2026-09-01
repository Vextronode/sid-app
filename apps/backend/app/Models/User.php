<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    protected $fillable = [
        'village_id',
        'citizen_id',
        'name',
        'username',
        'role',
        'email',
        'password',
        'is_active',
    ];

    public function village()
    {
        return $this->belongsTo(Village::class);
    }

    public function citizen()
    {
        return $this->belongsTo(Citizen::class);
    }

    public function letters()
    {
        return $this->hasMany(Letter::class, 'submitted_by');
    }

    public function letterApprovals(): HasMany
    {
        return $this->hasMany(LetterApproval::class, 'approved_by');
    }

    public function official()
    {
        return $this->hasOne(Official::class);
    }

    public function news()
    {
        return $this->hasMany(News::class);
    }
}
