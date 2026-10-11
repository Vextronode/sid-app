<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * `user_id` menolak menerima permintaan tanda tangan dari `blocked_user_id`.
 */
class SignatureBlock extends Model
{
    protected $fillable = [
        'user_id',
        'blocked_user_id',
    ];

    public function blockedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'blocked_user_id');
    }
}
