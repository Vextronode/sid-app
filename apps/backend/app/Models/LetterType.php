<?php

namespace App\Models;

use App\Enums\LetterDataAction;
use App\Enums\LetterTypeCategory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LetterType extends Model
{
    use HasFactory;

    protected $fillable = [
        'village_id',
        'code',
        'name',
        'description',
        'category',
        'template',
        'documents',
        'requirement_info',
        'flow_id',
        'assigned_role',
        'validity_days',
        'is_active',
        'classification_code',
        'produces_letter',
        'data_action',
        'form_fields',
        'data_fields',
        'data_subject_field',
        'signature_slots',
        'supporting_template',
        'issues_letter_number',
        'signed_by_village_head',
    ];

    protected $attributes = [
        'category' => 'persuratan',
        'issues_letter_number' => true,
        'signed_by_village_head' => true,
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'category' => LetterTypeCategory::class,
        'produces_letter' => 'boolean',
        'issues_letter_number' => 'boolean',
        'signed_by_village_head' => 'boolean',
        'data_action' => LetterDataAction::class,
        'form_fields' => 'array',
        'data_fields' => 'array',
        'signature_slots' => 'array',
        'documents' => 'array',
    ];

    public function flow(): BelongsTo
    {
        return $this->belongsTo(ApprovalFlow::class, 'flow_id');
    }
}
