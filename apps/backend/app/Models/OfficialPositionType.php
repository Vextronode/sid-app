<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Jenis jabatan desa tanpa akun (mis. Kasi Kesejahteraan, Kaur Keuangan),
 * dikelola Staf SIDUTama. Jabatan yang punya akun ada di enum OfficialPosition.
 */
class OfficialPositionType extends Model
{
    use HasFactory;

    protected $fillable = [
        'village_id',
        'code',
        'label',
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
}
