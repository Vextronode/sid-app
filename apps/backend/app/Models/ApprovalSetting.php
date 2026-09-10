<?php

namespace App\Models;

use App\Enums\ApprovalLevel;
use Database\Factories\ApprovalSettingFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalSetting extends Model
{
    /** @use HasFactory<ApprovalSettingFactory> */
    use HasFactory;

    protected $fillable = [
        'village_id',
        'approval_level',
        'deadline_hours',
        'reminder_hours',
        'is_active',
    ];

    protected $casts = [
        'approval_level' => ApprovalLevel::class,
        'deadline_hours' => 'integer',
        'reminder_hours' => 'integer',
        'is_active' => 'boolean',
    ];

    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }
}
