<?php

namespace App\Models;

use App\Enums\ApprovalLevel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LetterApproval extends Model
{
    protected $fillable = [
        'letter_id',
        'approved_by',
        'approval_level',
        'flow_step_id',
        'action',
        'notes',
        'deadline_at',
        'reminded_at',
    ];

    protected $casts = [
        'approval_level' => ApprovalLevel::class,
        'deadline_at' => 'datetime',
        'reminded_at' => 'datetime',
    ];

    public function letter(): BelongsTo
    {
        return $this->belongsTo(Letter::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function flowStep(): BelongsTo
    {
        return $this->belongsTo(FlowStep::class, 'flow_step_id');
    }

    public function official(): BelongsTo
    {
        return $this->belongsTo(Official::class);
    }
}
