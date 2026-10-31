<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Village extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'code',
        'head_name',
        'address',
        'phone',
        'district',
        'regency',
        'province',
        'postal_code',
        'area_code',
        'email',
        'area_ha',
        'logo',
        'hero_image',
        'hero_photo_credit',
        'office_hours',
        'welcome_message',
        'latitude',
        'longitude',
        'history',
        'vision',
        'mission',
    ];

    protected $casts = [
        'area_ha' => 'float',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    /**
     * Logo dan foto hero berisi path aset frontend (/assets/..., dari seeder),
     * URL lengkap, atau path unggahan di disk public. Hanya yang terakhir
     * berupa berkas milik backend.
     */
    public static function isUploadedMedia(?string $value): bool
    {
        return $value !== null
            && $value !== ''
            && ! str_starts_with($value, '/')
            && ! preg_match('#^https?://#i', $value);
    }

    public static function mediaUrl(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return self::isUploadedMedia($value) ? Storage::disk('public')->url($value) : $value;
    }

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

    public function occupations(): HasMany
    {
        return $this->hasMany(Occupation::class);
    }

    public function VillageRegulations(): HasMany
    {
        return $this->hasMany(VillageRegulation::class);
    }
}
