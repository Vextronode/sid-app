<?php

namespace App\Models;

use App\Enums\ElectricitySource;
use App\Enums\HouseOwnershipStatus;
use App\Enums\IncomeRange;
use App\Enums\WaterSource;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilySocioeconomic extends Model
{
    protected $fillable = [
        'family_id',
        'household_income_range',
        'house_ownership_status',
        'water_source',
        'electricity_source',
        'dependents_count',
        'productive_assets',
        'surveyed_at',
        'surveyed_by',
    ];

    /**
     * household_income_range is the combined monthly income of all family members.
     */
    protected $casts = [
        'household_income_range' => IncomeRange::class,
        'house_ownership_status' => HouseOwnershipStatus::class,
        'water_source' => WaterSource::class,
        'electricity_source' => ElectricitySource::class,
        'dependents_count' => 'integer',
        'productive_assets' => 'array',
        'surveyed_at' => 'datetime',
    ];

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function surveyor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'surveyed_by');
    }
}
