<?php

namespace App\Models;

use App\Enums\BloodType;
use App\Enums\DataSource;
use App\Enums\DomicileStatus;
use App\Enums\FamilyRole;
use App\Enums\LastEducation;
use App\Enums\Religion;
use App\Enums\ResidencyType;
use App\Enums\SyncStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Citizen extends Model
{
    use HasFactory;

    protected $fillable = [
        'village_id',
        'nik',
        'nik_hash',
        'name',
        'date_of_birth',
        'place_of_birth',
        'gender',
        'blood_type',
        'address',
        'rt_id',
        'rw_id',
        'hamlet_id',
        'family_id',
        'family_role',
        'father_id',
        'mother_id',
        'father_name_text',
        'mother_name_text',
        'marital_status',
        'occupation',
        'religion',
        'last_education',
        'domicile_status',
        'current_domicile',
        'residency_type',
        'origin_region',
        'data_source',
        'last_verified_at',
        'sync_status',
        'is_active',
    ];

    protected $casts = [
        'nik' => 'encrypted',
        'date_of_birth' => 'date',
        'is_active' => 'boolean',
        'blood_type' => BloodType::class,
        'religion' => Religion::class,
        'last_education' => LastEducation::class,
        'domicile_status' => DomicileStatus::class,
        'family_role' => FamilyRole::class,
        'residency_type' => ResidencyType::class,
        'data_source' => DataSource::class,
        'sync_status' => SyncStatus::class,
        'last_verified_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::saving(function (Citizen $citizen) {

            if ($citizen->isDirty('nik')) {
                $citizen->nik_hash = hash(
                    'sha256',
                    $citizen->nik
                );
            }

        });
    }

    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }

    public function rt(): BelongsTo
    {
        return $this->belongsTo(Rt::class);
    }

    public function rw(): BelongsTo
    {
        return $this->belongsTo(Rw::class);
    }

    public function hamlet(): BelongsTo
    {
        return $this->belongsTo(Hamlet::class);
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function father(): BelongsTo
    {
        return $this->belongsTo(Citizen::class, 'father_id');
    }

    public function mother(): BelongsTo
    {
        return $this->belongsTo(Citizen::class, 'mother_id');
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
