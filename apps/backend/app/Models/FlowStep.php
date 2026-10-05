<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Flow step definition. The database enum retains legacy approver values,
 * including `sekdes`, but application validation allows new flows to use
 * only `rt` and `kepala_desa`. Sekdes can act on a `kepala_desa` step;
 * OfficialService resolves both active positions for that step.
 *
 * UNIQUE(flowId, stepOrder) is enforced by the migration.
 */
class FlowStep extends Model
{
    use HasFactory;

    protected $fillable = [
        'flow_id',
        'step_order',
        'approver_position',
        'is_final',
    ];

    protected $casts = [
        'step_order' => 'integer',
        'is_final' => 'boolean',
    ];

    public function flow(): BelongsTo
    {
        return $this->belongsTo(ApprovalFlow::class, 'flow_id');
    }

    /** Approvals recorded against this specific flow step. */
    public function approvals(): HasMany
    {
        return $this->hasMany(LetterApproval::class, 'flow_step_id');
    }

    /** Whether this step resolves approvers by RT region. */
    public function isRegionBased(): bool
    {
        return $this->approver_position === 'rt';
    }

    public function resolvablePositions(): array
    {
        return [$this->approver_position];
    }
}
