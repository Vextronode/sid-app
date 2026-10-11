<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * EV5-1-S2. Sesuai Class Diagram Core v5 (entity ApprovalFlow).
 *
 * Semua tipe surat memakai satu flow RT -> Kepala Desa/Sekdes. Flow dan
 * step-nya diset developer lewat seeder; tidak ada endpoint tulis.
 */
class ApprovalFlow extends Model
{
    use HasFactory;

    protected $fillable = [
        'village_id',
        'name',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

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
