<?php

namespace App\Models;

use App\Services\AreaApprovalRouter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu percobaan pendaftaran akun warga yang menunggu aktivasi petugas
 * wilayah (lihat AccountActivationService). Baris terbaru per warga adalah
 * keadaan pendaftarannya saat ini.
 */
class AccountRegistration extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const METHOD_ONLINE = 'online';

    /** Diaktifkan Staf SIDUTama setelah NIK diblokir (tolak 3 kali). */
    public const METHOD_MANUAL = 'manual';

    /** Jenjang petugas pemegang aktivasi (lihat AreaApprovalRouter). */
    public const LEVEL_RT = AreaApprovalRouter::LEVEL_RT;

    public const LEVEL_RW = AreaApprovalRouter::LEVEL_RW;

    public const LEVEL_KADUS = AreaApprovalRouter::LEVEL_KADUS;

    public const LEVEL_STAF_SID = AreaApprovalRouter::LEVEL_STAF_SID;

    /** Penolakan yang membuat NIK diblokir dari pendaftaran online. */
    public const MAX_REJECTIONS = 3;

    protected $fillable = [
        'village_id',
        'citizen_id',
        'user_id',
        'rt_id',
        'rw_id',
        'hamlet_id',
        'status',
        'method',
        'photo_path',
        'decided_by',
        'decided_level',
        'decided_at',
        'decision_notes',
    ];

    protected $casts = [
        'decided_at' => 'datetime',
    ];

    public function citizen(): BelongsTo
    {
        return $this->belongsTo(Citizen::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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
