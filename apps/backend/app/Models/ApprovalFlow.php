<?php

namespace App\Models;

use Database\Factories\ApprovalFlowsFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * EV5-1-S2. Sesuai Class Diagram Core v5 (entity ApprovalFlow).
 *
 * 1 category bisa punya BANYAK flow berbeda — flow baru = tambah row,
 * BUKAN ubah kode (Config over Code, SID-ARCH-SYS-001 S1).
 */
class ApprovalFlow extends Model
{
    /** @use HasFactory<ApprovalFlowsFactory> */
    use HasFactory;

    protected $fillable = [
        'category_id',
        'name',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(LetterCategory::class, 'category_id');
    }

    /**
     * Eager-load ini (findWithSteps pattern di Repository) dipakai
     * LetterService saat submit surat (snapshot flow_id) dan saat
     * validasi gate step — lihat ApprovalFlowRepository (EV5-4).
     */
    public function steps(): HasMany
    {
        return $this->hasMany(FlowStep::class, 'flow_id')->orderBy('step_order');
    }

    public function letterTypes(): HasMany
    {
        return $this->hasMany(LetterType::class, 'flow_id');
    }

    /**
     * letters.flow_id adalah SNAPSHOT saat submit, DIKUNCI — bukan
     * live-reference (SID-ARCH-BE-001 S3.2). Relasi ini murni untuk query
     * "surat mana saja yang pernah pakai flow ini", bukan bagian dari
     * alur approval aktif.
     */
    public function letters(): HasMany
    {
        return $this->hasMany(Letter::class, 'flow_id');
    }
}
