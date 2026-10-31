<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Permintaan atur ulang kata sandi tanpa email. Status: pending, approved
 * (boleh membuat kata sandi baru sampai approved_until), rejected,
 * completed (kata sandi sudah dibuat) atau cancelled (digantikan
 * permintaan yang lebih baru untuk akun yang sama).
 */
class PasswordResetRequest extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    /** Status turunan: disetujui tetapi batas waktunya sudah lewat. */
    public const STATUS_EXPIRED = 'expired';

    public const APPROVAL_TTL_HOURS = 24;

    protected $fillable = [
        'user_id',
        'claim_token_hash',
        'status',
        'requester_ip',
        'handled_by',
        'handled_at',
        'response_notes',
        'approved_until',
        'completed_at',
    ];

    protected $hidden = [
        'claim_token_hash',
    ];

    protected $casts = [
        'handled_at' => 'datetime',
        'approved_until' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public function isClaimable(): bool
    {
        return $this->status === self::STATUS_APPROVED
            && $this->approved_until !== null
            && $this->approved_until->isFuture();
    }

    /**
     * Status yang ditampilkan ke pengaju: approved yang sudah lewat batas
     * waktunya dilaporkan sebagai expired.
     */
    public function effectiveStatus(): string
    {
        if ($this->status === self::STATUS_APPROVED && ! $this->isClaimable()) {
            return self::STATUS_EXPIRED;
        }

        return $this->status;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
