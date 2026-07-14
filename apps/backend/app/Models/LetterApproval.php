<?php

namespace App\Models;

use App\Enums\ApprovalLevel;
use Illuminate\Database\Eloquent\Model;

class LetterApproval extends Model
{
    protected $fillable = [
        'letter_id',
        'approved_by',
        'approval_level',
        'deadline_at',
        'reminded_at',
        'official_id',
        'status',
        'notes',
        'approved_at',
    ];

    protected $casts = [
        'approval_level' => ApprovalLevel::class,
        'deadline_at' => 'datetime',
        'reminded_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public function letter()
    {
        return $this->belongsTo(Letter::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
    public function official()
    {
        return $this->belongsTo(Official::class);
    }
}