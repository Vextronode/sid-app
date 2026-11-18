<?php

namespace App\Support;

use App\Enums\FamilyRole;

/**
 * Hubungan penanggung jawab (kontak darurat) CPMI dengan pemohon. Bila
 * penanggung jawab dipilih dari anggota KK pemohon, hubungannya diturunkan
 * dari SHDK keduanya di KK dan jenis kelamin anggota itu, tidak dipilih
 * pemohon. Logika yang sama ada di frontend (guardianRelation.ts) untuk
 * menampilkannya sebelum dikirim.
 */
class GuardianRelation
{
    /** Hubungan yang bisa dipilih untuk penanggung jawab di luar KK. */
    public const TYPED = [
        'suami' => 'Suami',
        'istri' => 'Istri',
        'ayah' => 'Ayah',
        'ibu' => 'Ibu',
        'saudara' => 'Saudara Kandung',
        'wali' => 'Wali Lainnya',
    ];

    /** Semua hubungan yang bisa tersimpan, termasuk turunan dari KK. */
    public const LABELS = self::TYPED + [
        'anak' => 'Anak',
        'mertua' => 'Mertua',
        'menantu' => 'Menantu',
        'cucu' => 'Cucu',
        'kakek_nenek' => 'Kakek/Nenek',
        'famili_lain' => 'Famili Lain',
    ];

    /** SHDK pasangan suami istri dalam KK. */
    private const COUPLE = [FamilyRole::KEPALA_KELUARGA, FamilyRole::SUAMI, FamilyRole::ISTRI];

    /**
     * Hubungan anggota KK `$member` dengan pemohon, dilihat dari pemohon
     * (mis. "ibu" = anggota itu ibu pemohon).
     */
    public static function between(?FamilyRole $applicant, ?FamilyRole $member, ?string $memberGender): string
    {
        $byGender = fn (string $male, string $female, string $unknown = 'famili_lain'): string => match ($memberGender) {
            'L' => $male,
            'P' => $female,
            default => $unknown,
        };
        $applicantInCouple = in_array($applicant, self::COUPLE, true);
        $memberInCouple = in_array($member, self::COUPLE, true);

        // Pemohon kepala keluarga atau pasangannya.
        if ($applicantInCouple) {
            return match (true) {
                $memberInCouple => $byGender('suami', 'istri'),
                $member === FamilyRole::ANAK => 'anak',
                $member === FamilyRole::MENANTU => 'menantu',
                $member === FamilyRole::CUCU => 'cucu',
                // Orang tua kepala keluarga = orang tua pemohon bila pemohon
                // kepala keluarga, mertua bila pemohon pasangannya; mertua
                // kepala keluarga sebaliknya.
                $member === FamilyRole::ORANG_TUA => $applicant === FamilyRole::KEPALA_KELUARGA
                    ? $byGender('ayah', 'ibu') : 'mertua',
                $member === FamilyRole::MERTUA => $applicant === FamilyRole::KEPALA_KELUARGA
                    ? 'mertua' : $byGender('ayah', 'ibu'),
                default => 'famili_lain',
            };
        }

        // Pemohon anak kepala keluarga.
        if ($applicant === FamilyRole::ANAK) {
            return match (true) {
                $memberInCouple => $byGender('ayah', 'ibu'),
                $member === FamilyRole::ANAK => 'saudara',
                in_array($member, [FamilyRole::ORANG_TUA, FamilyRole::MERTUA], true) => 'kakek_nenek',
                default => 'famili_lain',
            };
        }

        // Pemohon orang tua kepala keluarga.
        if ($applicant === FamilyRole::ORANG_TUA && $member === FamilyRole::KEPALA_KELUARGA) {
            return 'anak';
        }

        // Pemohon cucu kepala keluarga.
        if ($applicant === FamilyRole::CUCU && $memberInCouple) {
            return 'kakek_nenek';
        }

        return 'famili_lain';
    }

    public static function label(?string $relation): ?string
    {
        return $relation === null ? null : (self::LABELS[$relation] ?? $relation);
    }
}
