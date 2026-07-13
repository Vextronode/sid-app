<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Letter extends Model
{
    protected $fillable = [
        'village_id',
        'letter_type_id',
        'submitted_by',
        'on_behalf_of',
        'citizen_id',
        'letter_number',
        'applicant_name',
        'applicant_nik',
        'applicant_address',
        'purpose',
        'notes',
        'status',
        'is_overdue',
        'expires_at',
        'submitted_at',
        'processed_at',
    ];

    protected $guarded = [
        'applicant_nik_hash',
    ];

    protected $casts = [
        'applicant_nik_hash' => 'encrypted',
        'applicant_address' => 'encrypted',
        'status' => LetterStatus::class,
        'is_overdue' => 'boolean',
        'expires_at' => 'datetime',
        'submitted_at' => 'datetime',
        'processed_at' => 'datetime',
    ];


    protected static function booted(): void
    {
        static::saving(function (Letter $letter) {
            if($letter->isDirty('applicant_nik')) {
                $letter->applicant_nik_hash = hash('sha256', $letter->applicant_nik);
            }
        });
    }

    public function village()
    {
        return $this->belongsTo(Village::class);
    }

    public function letterType()
    {
        return $this->belongsTo(LetterType::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }


}
