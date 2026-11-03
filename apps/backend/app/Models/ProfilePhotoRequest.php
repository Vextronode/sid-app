<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Permintaan warga mengganti foto profil akunnya, diputuskan petugas
 * wilayah (lihat ProfilePhotoRequestService). Baris terbaru per akun adalah
 * keadaan permintaannya saat ini.
 */
class ProfilePhotoRequest extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'village_id',
        'user_id',
        'citizen_id',
        'rt_id',
        'rw_id',
        'hamlet_id',
        'status',
        'photo_path',
        'decided_by',
        'decided_level',
        'decided_at',
        'decision_notes',
    ];

    protected $casts = [
        'decided_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function citizen(): BelongsTo
    {
        return $this->belongsTo(Citizen::class);
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function rt(): BelongsTo
    {
        return $this->belongsTo(Rt::class);
    }

    public function rw(): BelongsTo
    {
        return $this->belongsTo(Rw::class);
    }

    public function hamlet(): BelongsTo
    {
        return $this->belongsTo(Hamlet::class);
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }
}
