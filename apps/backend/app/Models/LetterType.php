<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LetterType extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'template',
        'verification_type',
        'requirement_info',
        'assigned_role',
        'validity_days',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
