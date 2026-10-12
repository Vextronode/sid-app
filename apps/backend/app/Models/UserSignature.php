<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tanda tangan pribadi sebuah akun. Baris yang revoked_at-nya terisi
 * adalah TTD lama yang sudah direset; file-nya tetap disimpan karena
 * dokumen yang pernah ditandatangani masih merujuknya.
 */
class UserSignature extends Model
{
    protected $fillable = [
        'user_id',
        'path',
        'mime_type',
        'revoked_at',
        'revoked_by',
        'revoke_reason',
    ];

    protected $casts = [
        'revoked_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
