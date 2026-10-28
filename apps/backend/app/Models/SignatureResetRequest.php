<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pengajuan reset tanda tangan akun oleh pemiliknya. Status: pending,
 * approved (TTD aktif dicabut) atau rejected (tanpa perubahan).
 */
class SignatureResetRequest extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'user_id',
        'reason',
        'status',
        'handled_by',
        'handled_at',
        'response_notes',
    ];

    protected $casts = [
        'handled_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
