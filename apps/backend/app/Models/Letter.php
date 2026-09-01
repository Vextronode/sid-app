<?php

namespace App\Models;

use App\Enums\LetterStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Letter extends Model
{
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
        'revision_count',
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

    protected $appends = [
        'is_overdue',
    ];

    public function getIsOverdueAttribute(): bool
    {
        $approval = $this->approvals
            ->whereNull('approved_at')
            ->sortBy('deadline_at')
            ->first();

        if (! $approval || ! $approval->deadline_at) {
            return false;
        }

        return now()->gt($approval->deadline_at);
    }

    public function village()
    {
        return $this->belongsTo(Village::class);
    }

    public function approvals()
    {
        return $this->hasMany(LetterApproval::class);
    }

    public function letterType()
    {
        return $this->belongsTo(LetterType::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function statusLogs()
    {
        return $this->hasMany(LetterStatusLog::class)->latest('created_at');
    }

    public function citizen(): BelongsTo
    {
        return $this->belongsTo(Citizen::class);
    }
}
