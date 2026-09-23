<?php

namespace App\Models;

use App\Enums\FamilyStatus;
use Database\Factories\FamilyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Family extends Model
{
    /** @use HasFactory<FamilyFactory> */
    use HasFactory;

    protected $fillable = [
        'village_id',
        'no_kk',
        'no_kk_hash',
        'family_address',
        'family_status',
        'rt_id',
        'rw_id',
        'hamlet_id',
        'head_of_family_id',
    ];

    protected $casts = [
        'family_status' => FamilyStatus::class,
        'no_kk' => 'encrypted',
        'family_address' => 'encrypted',
    ];

    protected static function booted(): void
    {
        static::saving(function (Family $family) {

            if ($family->isDirty('no_kk')) {
                $family->no_kk_hash = hash(
                    'sha256',
                    $family->no_kk
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

    public function headOfFamily(): BelongsTo
    {
        return $this->belongsTo(Citizen::class, 'head_of_family_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(Citizen::class, 'family_id');
    }
}
