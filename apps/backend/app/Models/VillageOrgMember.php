<?php

namespace App\Models;

use Database\Factories\VillageOrgMemberFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VillageOrgMember extends Model
{
    /** @use HasFactory<VillageOrgMemberFactory> */
    use HasFactory;

    protected $fillable = [
        'position_id',
        'member_name',
        'photo_img',
        'phone_wa',
        'started_at',
        'ended_at',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'started_at' => 'date',
        'ended_at' => 'date',
        'is_active' => 'boolean',
    ];

    public function position(): BelongsTo
    {
        return $this->belongsTo(VillageOrgPosition::class, 'position_id');
    }
}
