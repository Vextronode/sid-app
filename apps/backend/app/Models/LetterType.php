<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LetterType extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'template',
        'verification_type',
        'requirement_info',
        'category_id',
        'flow_id',
        'assigned_role',
        'validity_days',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(LetterCategory::class, 'category_id');
    }

    public function flow(): BelongsTo
    {
        return $this->belongsTo(ApprovalFlow::class, 'flow_id');
    }
}
