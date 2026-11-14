<?php

namespace App\Models;

use App\Enums\BusinessCategory;
use App\Enums\CimartApplicationStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Data usaha warga dari Surat Keterangan Usaha yang terbit, beserta status
 * pendaftarannya ke Cimart. Lihat CitizenBusinessService.
 */
class CitizenBusiness extends Model
{
    use HasFactory, HasUuids;

    /** Jenis surat sumber data usaha. */
    public const SOURCE_LETTER_TYPE_CODE = 'A01';

    /** Jawaban "Ya" pada isian `daftar_cimart` di form SKU. */
    public const CIMART_OPT_IN = 'ya';

    protected $fillable = [
        'village_id',
        'citizen_id',
        'letter_id',
        'business_name',
        'business_activity',
        'category',
        'email',
        'phone',
        'address',
        'cimart_status',
        'cimart_requested_at',
        'cimart_decided_at',
        'cimart_note',
        'cimart_cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'category' => BusinessCategory::class,
            'email' => 'encrypted',
            'phone' => 'encrypted',
            'cimart_status' => CimartApplicationStatus::class,
            'cimart_requested_at' => 'datetime',
            'cimart_decided_at' => 'datetime',
            'cimart_cancelled_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Village, $this> */
    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }

    /** @return BelongsTo<Citizen, $this> */
    public function citizen(): BelongsTo
    {
        return $this->belongsTo(Citizen::class);
    }

    /** @return BelongsTo<Letter, $this> */
    public function letter(): BelongsTo
    {
        return $this->belongsTo(Letter::class);
    }
}
