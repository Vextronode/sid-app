<?php

namespace App\Models;

use App\Enums\ElectricitySource;
use App\Enums\HouseOwnershipStatus;
use App\Enums\IncomeRange;
use App\Enums\WaterSource;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CitizenSocioeconomic extends Model
{
    protected $fillable = [
        'citizen_id',
        'income_range',
        'house_ownership_status',
        'water_source',
        'electricity_source',
        'dependents_count',
        'productive_assets',
        'surveyed_at',
        'surveyed_by',
    ];

    protected $casts = [
        'income_range' => IncomeRange::class,
        'house_ownership_status' => HouseOwnershipStatus::class,
        'water_source' => WaterSource::class,
        'electricity_source' => ElectricitySource::class,
        'dependents_count' => 'integer',
        'productive_assets' => 'array',
        'surveyed_at' => 'datetime',
    ];

    public function citizen(): BelongsTo
    {
        return $this->belongsTo(Citizen::class);
    }

    public function surveyor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'surveyed_by');
    }
}
