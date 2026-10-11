<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LetterAttachment extends Model
{
    public const KIND_ATTACHMENT = 'attachment';

    public const KIND_FIELD = 'field';

    public const KIND_WET_SIGNATURE = 'wet_signature';

    protected $fillable = [
        'letter_id',
        'kind',
        'field',
        'original_name',
        'path',
        'mime_type',
        'size',
        'uploaded_by',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    public function letter(): BelongsTo
    {
        return $this->belongsTo(Letter::class);
    }
}
