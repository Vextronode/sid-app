<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Data Calon Pekerja Migran Indonesia dari pengajuan F11 yang disetujui
 * Kepala Desa, satu baris per keberangkatan. Lihat MigrantWorkerService.
 */
class MigrantWorker extends Model
{
    use HasFactory, HasUuids;

    /** Jenis layanan sumber data CPMI. */
    public const SOURCE_LETTER_TYPE_CODE = 'F11';

    /** Nilai `negara_tujuan` yang negaranya diketik di `negara_tujuan_lainnya`. */
    public const OTHER_COUNTRY = 'lainnya';

    protected $fillable = [
        'village_id',
        'citizen_id',
        'letter_id',
        'height_cm',
        'weight_kg',
        'phone',
        'email',
        'education_level',
        'school_name',
        'major',
        'graduation_year',
        'certificates',
        'work_history',
        'guardian_relation',
        'guardian_name',
        'guardian_address',
        'guardian_phone',
        'guardian_email',
        'destination_country',
        'employer_name',
        'employer_address',
        'employer_contact',
        'agency_name',
        'agency_contact',
        'position',
        'salary_facilities',
        'contract_start',
        'contract_end',
    ];

    protected function casts(): array
    {
        return [
            'height_cm' => 'integer',
            'weight_kg' => 'integer',
            'graduation_year' => 'integer',
            'phone' => 'encrypted',
            'email' => 'encrypted',
            'certificates' => 'array',
            'work_history' => 'encrypted:array',
            'guardian_address' => 'encrypted',
            'guardian_phone' => 'encrypted',
            'guardian_email' => 'encrypted',
            'employer_address' => 'encrypted',
            'employer_contact' => 'encrypted',
            'salary_facilities' => 'encrypted',
            'contract_start' => 'date',
            'contract_end' => 'date',
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
