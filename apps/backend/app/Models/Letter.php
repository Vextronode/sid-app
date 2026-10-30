<?php

namespace App\Models;

use App\Enums\LetterResultStage;
use App\Enums\LetterStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Letter extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'village_id',
        'letter_type_id',
        'submitted_by',
        'on_behalf_of',
        'citizen_id',
        'rt_id',
        'rw_id',
        'hamlet_id',
        'letter_number',
        'applicant_name',
        'applicant_nik',
        'applicant_address',
        'purpose',
        'payload',
        'notes',
        'status',
        'flow_id',
        'current_step_order',
        'rejected_at_step',
        'is_overdue',
        'expires_at',
        'submitted_at',
        'processed_at',
        'snapshot',
        'signed_by_official_id',
        'fulfilled_at',
        'fulfilled_by',
        'fulfillment',
    ];

    protected $guarded = [
        'applicant_nik_hash',
    ];

    protected $casts = [
        'applicant_nik' => 'encrypted',
        'applicant_address' => 'encrypted',
        'payload' => 'array',

        'status' => LetterStatus::class,

        'current_step_order' => 'integer',
        'rejected_at_step' => 'integer',

        'is_overdue' => 'boolean',
        'expires_at' => 'datetime',
        'submitted_at' => 'datetime',
        'processed_at' => 'datetime',
        'snapshot' => 'array',
        'fulfilled_at' => 'datetime',
        'fulfillment' => 'array',
    ];

    protected static function booted(): void
    {
        // Wilayah pemohon dibekukan saat pemohon ditautkan ke surat, bukan
        // dibaca dari alamat warga yang sekarang.
        static::saving(function (Letter $letter) {
            if ($letter->citizen_id !== null && $letter->isDirty('citizen_id') && ! $letter->isDirty('rt_id')) {
                $citizen = Citizen::query()->with('rt:id,rw_id')->find($letter->citizen_id);
                $letter->rt_id = $citizen?->rt_id;
                $letter->rw_id = $citizen?->rt?->rw_id;
                $letter->hamlet_id = $citizen?->hamlet_id;
            }
        });

        static::saving(function (Letter $letter) {
            if ($letter->isDirty('applicant_nik')) {
                $letter->applicant_nik_hash = hash('sha256', $letter->applicant_nik);
            }
        });
    }

    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }

    public function flow(): BelongsTo
    {
        return $this->belongsTo(ApprovalFlow::class, 'flow_id');
    }

    public function currentFlowStep(): ?FlowStep
    {
        return FlowStep::query()
            ->where('flow_id', $this->flow_id)
            ->where('step_order', $this->current_step_order)
            ->first();
    }

    /** @return HasMany<LetterApproval, $this> */
    public function approvals(): HasMany
    {
        return $this->hasMany(LetterApproval::class);
    }

    /**
     * Keputusan tolak terakhir; notes-nya alasan penolakan untuk daftar surat.
     *
     * @return HasOne<LetterApproval, $this>
     */
    public function latestRejection(): HasOne
    {
        return $this->hasOne(LetterApproval::class)->ofMany(
            ['id' => 'max'],
            fn (Builder $query) => $query->where('action', 'rejected'),
        );
    }

    /** @return HasMany<LetterAttachment, $this> */
    public function attachments(): HasMany
    {
        return $this->hasMany(LetterAttachment::class);
    }

    /** @return HasMany<LetterSignature, $this> */
    public function signatures(): HasMany
    {
        return $this->hasMany(LetterSignature::class);
    }

    /** @return HasMany<LetterResult, $this> */
    public function results(): HasMany
    {
        return $this->hasMany(LetterResult::class)->orderBy('id');
    }

    /** @return HasOne<LetterResult, $this> */
    public function latestResult(): HasOne
    {
        return $this->hasOne(LetterResult::class)->latestOfMany('id');
    }

    /**
     * Tahap unggah hasil dari instansi luar; null bila jenis suratnya tidak
     * mewajibkan unggah hasil atau surat belum terbit.
     */
    public function resultStage(): ?LetterResultStage
    {
        if ($this->status !== LetterStatus::Approved) {
            return null;
        }

        $this->loadMissing('letterType');

        if (! $this->letterType?->requires_result_upload) {
            return null;
        }

        $this->loadMissing('latestResult');

        return match ($this->latestResult?->status) {
            LetterResult::STATUS_SUBMITTED => LetterResultStage::UnderReview,
            LetterResult::STATUS_ACCEPTED => LetterResultStage::Accepted,
            default => LetterResultStage::AwaitingUpload,
        };
    }

    /**
     * Masa berlaku dicap saat final approve dari `letter_types.validity_days`;
     * surat tanpa `expires_at` berlaku tanpa batas.
     */
    public function isExpired(): bool
    {
        return $this->expires_at !== null && now()->greaterThan($this->expires_at);
    }

    public function letterType(): BelongsTo
    {
        return $this->belongsTo(LetterType::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(LetterStatusLog::class)->latest('created_at');
    }

    public function citizen(): BelongsTo
    {
        return $this->belongsTo(Citizen::class);
    }

    public function rt(): BelongsTo
    {
        return $this->belongsTo(Rt::class);
    }

    public function rw(): BelongsTo
    {
        return $this->belongsTo(Rw::class);
    }

    /** Akun pengaju atau warga pemohon surat (akun lain milik orang yang sama). */
    public function isApplicant(User $user): bool
    {
        return $this->isSubmittedBy($user)
            || ($this->citizen_id !== null && (string) $this->citizen_id === (string) $user->citizen_id);
    }

    public function isSubmittedBy(User $user): bool
    {
        return (string) $this->submitted_by === (string) $user->getKey();
    }
}
