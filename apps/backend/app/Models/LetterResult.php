<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Satu unggahan hasil dari instansi luar untuk sebuah surat pelayanan.
 */
class LetterResult extends Model
{
    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'letter_id',
        'status',
        'submitted_by',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function letter(): BelongsTo
    {
        return $this->belongsTo(Letter::class);
    }

    /** @return HasMany<LetterAttachment, $this> */
    public function attachments(): HasMany
    {
        return $this->hasMany(LetterAttachment::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
