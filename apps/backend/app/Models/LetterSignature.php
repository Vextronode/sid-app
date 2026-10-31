<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu percobaan mengisi saksi (atau persetujuan pihak terkait) pada surat.
 * Baris terbaru per slot adalah keadaan slot saat ini.
 */
class LetterSignature extends Model
{
    /** Saksi pada isian form (isian NIK ber-`witness`): cukup persetujuan, tanpa TTD. */
    public const SIGNER_WITNESS = 'witness';

    /** Saksi menyetujui lewat akunnya. */
    public const METHOD_CONSENT = 'consent';

    /** Saksi warga desa tanpa akun: diverifikasi RT saat memutuskan. */
    public const METHOD_RT_CHECK = 'rt_check';

    /** Saksi dari luar data penduduk: nama diketik pemohon. */
    public const METHOD_MANUAL = 'manual';

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

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }
}
