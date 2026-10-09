<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use NotificationChannels\WebPush\HasPushSubscriptions;

#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasPushSubscriptions, HasUuids, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
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
        'must_change_password',
    ];

    public function setUsernameAttribute(string $value): void
    {
        $this->attributes['username'] = Str::lower(trim($value));
    }

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

    public function official(): HasOne
    {
        return $this->hasOne(Official::class)->where('is_active', true);
    }

    public function officials(): HasMany
    {
        return $this->hasMany(Official::class);
    }

    public function news()
    {
        return $this->hasMany(News::class);
    }
}
