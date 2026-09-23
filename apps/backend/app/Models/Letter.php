<?php

namespace App\Models;

use App\Enums\LetterStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Letter extends Model
{
    use HasFactory;

    protected $fillable = [
        'village_id',
        'letter_type_id',
        'submitted_by',
        'on_behalf_of',
        'citizen_id',
        'letter_number',
        'applicant_name',
        'applicant_nik',
        'applicant_address',
        'purpose',
        'payload',
        'notes',
        'status',
        'flow_id',
        'current_step_order',
        'rejected_at_step',
        'is_overdue',
        'expires_at',
        'submitted_at',
        'processed_at',
    ];

    protected $guarded = [
        'applicant_nik_hash',
    ];

    protected $casts = [
        'applicant_nik' => 'encrypted',
        'applicant_address' => 'encrypted',
        'payload' => 'array',

        'status' => LetterStatus::class,

        'current_step_order' => 'integer',
        'rejected_at_step' => 'integer',

        'is_overdue' => 'boolean',
        'expires_at' => 'datetime',
        'submitted_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::saving(function (Letter $letter) {
            if ($letter->isDirty('applicant_nik')) {
                $letter->applicant_nik_hash = hash('sha256', $letter->applicant_nik);
            }
        });
    }

    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }

    public function flow(): BelongsTo
    {
        return $this->belongsTo(ApprovalFlow::class, 'flow_id');
    }

    public function currentFlowStep(): ?FlowStep
    {
        return FlowStep::query()
            ->where('flow_id', $this->flow_id)
            ->where('step_order', $this->current_step_order)
            ->first();
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(LetterApproval::class);
    }

    public function letterType(): BelongsTo
    {
        return $this->belongsTo(LetterType::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(LetterStatusLog::class)->latest('created_at');
    }

    public function citizen(): BelongsTo
    {
        return $this->belongsTo(Citizen::class);
    }
}
