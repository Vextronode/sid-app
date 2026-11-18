<?php

namespace App\Support;

use App\Enums\ResidencyType;
use App\Models\Citizen;
use Illuminate\Support\Carbon;

/**
 * Saran "lama berdomisili" untuk isian surat (mis. Pengantar SKCK). Data
 * penduduk tidak menyimpan tanggal mulai tinggal, jadi ini hanya nilai awal
 * yang tetap bisa diubah pemohon dan diverifikasi RT:
 *  - warga lokal: "Sejak lahir";
 *  - pendatang: lama sejak datanya dicatat di desa (citizens.created_at),
 *    mis. lewat Terapkan Pindah Datang.
 */
class DomicileDuration
{
    public static function hint(Citizen $citizen, ?Carbon $now = null): ?string
    {
        $residency = $citizen->residency_type instanceof ResidencyType
            ? $citizen->residency_type
            : ResidencyType::tryFrom((string) $citizen->residency_type);

        if ($residency !== ResidencyType::PENDATANG) {
            return 'Sejak lahir';
        }

        if ($citizen->created_at === null) {
            return null;
        }

        $now ??= now();
        $years = (int) $citizen->created_at->diffInYears($now);

        if ($years >= 1) {
            return "{$years} tahun";
        }

        $months = (int) $citizen->created_at->diffInMonths($now);

        return $months >= 1 ? "{$months} bulan" : 'Kurang dari 1 bulan';
    }
}
