<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu percobaan mengisi sebuah slot tanda tangan pada surat. Baris
 * terbaru per slot adalah keadaan slot saat ini.
 */
class LetterSignature extends Model
{
    public const SIGNER_APPLICANT = 'applicant';

    public const SIGNER_OTHER = 'other';

    public const METHOD_DIGITAL = 'digital';

    public const METHOD_WET = 'wet';

    public const STATUS_PENDING = 'pending';

    public const STATUS_SIGNED = 'signed';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'letter_id',
        'slot_key',
        'slot_label',
        'signer_type',
        'method',
        'status',
        'requested_by',
        'target_nik_hash',
        'signer_user_id',
        'signer_name',
        'user_signature_id',
        'attachment_id',
        'expires_at',
        'responded_at',
        'response_notes',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'responded_at' => 'datetime',
    ];

    public function letter(): BelongsTo
    {
        return $this->belongsTo(Letter::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function userSignature(): BelongsTo
    {
        return $this->belongsTo(UserSignature::class);
    }

    public function attachment(): BelongsTo
    {
        return $this->belongsTo(LetterAttachment::class, 'attachment_id');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }
}
