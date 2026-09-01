<?php

namespace App\Models;

use App\Enums\LetterStatus;
use Illuminate\Database\Eloquent\Model;

class LetterStatusLog extends Model
{
    protected $fillable = [
        'letter_id',
        'actor_id',
        'old_status',
        'new_status',
        'reason',
    ];

    protected $casts = [
        'old_status' => LetterStatus::class,
        'new_status' => LetterStatus::class,
        'created_at' => 'datetime',
    ];

    public function letter()
    {
        return $this->belongsTo(Letter::class);
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function isRejection()
    {
        return $this->new_status?->isRejected() ?? false;
    }
}
