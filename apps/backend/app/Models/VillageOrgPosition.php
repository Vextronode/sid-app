<?php

namespace App\Models;

use Database\Factories\VillageOrgPositionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VillageOrgPosition extends Model
{
    /** @use HasFactory<VillageOrgPositionFactory> */
    use HasFactory;

    protected $fillable = [
        'village_id',
        'org_type',
        'position_label',
        'is_single_occupant',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_single_occupant' => 'boolean',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(VillageOrgMember::class, 'position_id');
    }

    /**
     * Anggota yang sedang aktif menjabat (bisa lebih dari 1 jika
     * is_single_occupant=false, misal "Anggota BPD").
     */
    public function activeMembers(): HasMany
    {
        return $this->members()->where('is_active', true);
    }
}
