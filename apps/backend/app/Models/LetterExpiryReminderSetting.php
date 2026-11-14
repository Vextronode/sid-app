<?php

namespace App\Models;

use Database\Factories\LetterExpiryReminderSettingFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu titik pengingat masa berlaku surat (H-n) per desa. Hanya
 * `is_active` yang boleh diubah lewat API; `activated_at` diisi service
 * setiap kali titik berubah dari nonaktif ke aktif.
 */
class LetterExpiryReminderSetting extends Model
{
    /** @use HasFactory<LetterExpiryReminderSettingFactory> */
    use HasFactory;

    /** Titik yang tersedia, dari yang paling jauh ke hari terakhir. */
    public const DAYS_BEFORE_OPTIONS = [30, 14, 7, 3, 1];

    protected $fillable = [
        'village_id',
        'days_before',
        'is_active',
        'activated_at',
    ];

    protected $casts = [
        'days_before' => 'integer',
        'is_active' => 'boolean',
        'activated_at' => 'datetime',
    ];

    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }
}
