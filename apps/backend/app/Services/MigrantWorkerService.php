<?php

namespace App\Services;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\MigrantWorker;
use App\Support\GuardianRelation;
use Illuminate\Support\Str;

/**
 * Data CPMI dicatat saat pengajuan F11 disetujui Kepala Desa. Satu baris
 * per pengajuan (keberangkatan): pengajuan berikutnya menambah baris baru,
 * tidak menimpa, sehingga riwayat penempatan warga tetap utuh.
 */
class MigrantWorkerService
{
    public function recordFromLetter(Letter $letter): ?MigrantWorker
    {
        if ($letter->letterType?->code !== MigrantWorker::SOURCE_LETTER_TYPE_CODE) {
            return null;
        }

        $existing = MigrantWorker::query()->where('letter_id', $letter->id)->first();

        if ($existing !== null) {
            return $existing;
        }

        $payload = $letter->payload ?? [];

        return MigrantWorker::query()->create([
            'village_id' => $letter->village_id,
            'citizen_id' => $letter->citizen_id,
            'letter_id' => $letter->id,
            'height_cm' => self::integer($payload['tinggi_badan'] ?? null),
            'weight_kg' => self::integer($payload['berat_badan'] ?? null),
            'phone' => self::phone($payload['telepon'] ?? null),
            'email' => self::text($payload['email'] ?? null),
            'education_level' => self::text($payload['pendidikan_terakhir'] ?? null),
            'school_name' => self::text($payload['nama_sekolah'] ?? null),
            'major' => self::text($payload['jurusan'] ?? null),
            'graduation_year' => self::integer($payload['tahun_lulus'] ?? null),
            'certificates' => self::rows($payload['sertifikat'] ?? null, ['nama_sertifikat', 'penerbit', 'tahun']),
            'work_history' => self::rows($payload['pengalaman_kerja'] ?? null, ['perusahaan', 'jabatan', 'mulai', 'selesai', 'deskripsi']),
            'guardian_relation' => self::text($payload['penanggung_jawab_hubungan'] ?? null),
            // Penanggung jawab dari anggota KK: nama dan alamat dari data penduduk.
            'guardian_name' => self::text($payload['penanggung_jawab_nama'] ?? null)
                ?? self::text($payload['penanggung_jawab_anggota_nama'] ?? null),
            'guardian_address' => self::text($payload['penanggung_jawab_alamat'] ?? null)
                ?? self::memberAddress($payload),
            'guardian_phone' => self::phone($payload['penanggung_jawab_telepon'] ?? null),
            'guardian_email' => self::text($payload['penanggung_jawab_email'] ?? null),
            'destination_country' => self::country($payload),
            'employer_name' => self::text($payload['nama_pemberi_kerja'] ?? null),
            'employer_address' => self::text($payload['alamat_pemberi_kerja'] ?? null),
            'employer_contact' => self::text($payload['kontak_pemberi_kerja'] ?? null),
            'agency_name' => self::text($payload['nama_p3mi'] ?? null),
            'agency_contact' => self::text($payload['kontak_p3mi'] ?? null),
            'position' => self::text($payload['jabatan_kerja'] ?? null),
            'salary_facilities' => self::text($payload['gaji_fasilitas'] ?? null),
            'contract_start' => self::text($payload['kontrak_mulai'] ?? null),
            'contract_end' => self::text($payload['kontrak_selesai'] ?? null),
        ]);
    }

    /**
     * Saat pengajuan F11: bila penanggung jawab dipilih dari anggota KK,
     * hubungannya dengan pemohon diturunkan dari SHDK keduanya
     * (GuardianRelation), menimpa apa pun yang dikirim. Penanggung jawab di
     * luar KK memakai hubungan yang dipilih pemohon.
     *
     * @param  array<string, mixed>|null  $payload
     * @return array<string, mixed>|null
     */
    public static function withGuardianRelation(LetterType $letterType, Citizen $applicant, ?array $payload): ?array
    {
        if ($letterType->code !== MigrantWorker::SOURCE_LETTER_TYPE_CODE || $payload === null) {
            return $payload;
        }

        $memberId = $payload['penanggung_jawab_anggota'] ?? null;

        if (($payload['penanggung_jawab_sumber'] ?? null) !== self::GUARDIAN_FROM_FAMILY || blank($memberId)) {
            return $payload;
        }

        $member = Citizen::query()
            ->where('family_id', $applicant->family_id)
            ->find($memberId, ['id', 'family_role', 'gender']);

        if ($member === null) {
            return $payload;
        }

        $relation = GuardianRelation::between($applicant->family_role, $member->family_role, $member->gender);

        return [
            ...$payload,
            'penanggung_jawab_hubungan' => $relation,
            'penanggung_jawab_hubungan_label' => GuardianRelation::label($relation),
        ];
    }

    /** Nilai `penanggung_jawab_sumber` untuk penanggung jawab dari anggota KK. */
    public const GUARDIAN_FROM_FAMILY = 'kk';

    /**
     * Data CPMI terakhir warga ini, untuk mengisi awal form pengajuan
     * berikutnya (pendidikan, kompetensi, penanggung jawab, penempatan).
     *
     * @return array<string, mixed>
     */
    public function prefillFor(?string $citizenId): array
    {
        if ($citizenId === null) {
            return [];
        }

        $latest = MigrantWorker::query()
            ->where('citizen_id', $citizenId)
            ->latest('created_at')
            ->latest('id')
            ->first();

        if ($latest === null) {
            return [];
        }

        $payload = $latest->letter?->payload ?? [];

        // Hanya isian yang bertahan antarkeberangkatan; kontrak dan dokumen
        // selalu baru.
        return array_filter(
            array_intersect_key($payload, array_flip(self::CARRIED_FIELDS)),
            fn (mixed $value): bool => $value !== null && $value !== '' && $value !== [],
        );
    }

    /** Isian F11 yang dibawa ke pengajuan CPMI berikutnya. */
    public const CARRIED_FIELDS = [
        'tinggi_badan',
        'berat_badan',
        'telepon',
        'email',
        'pendidikan_terakhir',
        'nama_sekolah',
        'jurusan',
        'tahun_lulus',
        'sertifikat',
        'pengalaman_kerja',
        'penanggung_jawab_sumber',
        'penanggung_jawab_hubungan',
        'penanggung_jawab_anggota',
        'penanggung_jawab_nama',
        'penanggung_jawab_alamat',
        'penanggung_jawab_telepon',
        'penanggung_jawab_email',
    ];

    /** @param  array<string, mixed>  $payload */
    private static function memberAddress(array $payload): ?string
    {
        $address = self::text($payload['penanggung_jawab_anggota_alamat'] ?? null);

        if ($address === null) {
            return null;
        }

        $area = array_filter([
            ($rt = self::text($payload['penanggung_jawab_anggota_rt'] ?? null)) ? "RT {$rt}" : null,
            ($rw = self::text($payload['penanggung_jawab_anggota_rw'] ?? null)) ? "RW {$rw}" : null,
            ($dusun = self::text($payload['penanggung_jawab_anggota_dusun'] ?? null)) ? "Dusun {$dusun}" : null,
        ]);

        return $area === [] ? $address : $address.', '.implode(' ', $area);
    }

    /** @param  array<string, mixed>  $payload */
    private static function country(array $payload): string
    {
        $country = self::text($payload['negara_tujuan'] ?? null);

        if ($country === MigrantWorker::OTHER_COUNTRY) {
            $country = self::text($payload['negara_tujuan_lainnya'] ?? null);
        }

        return $country ?? '-';
    }

    /**
     * @param  array<int, string>  $keys
     * @return array<int, array<string, string|null>>
     */
    private static function rows(mixed $rows, array $keys): array
    {
        if (! is_array($rows)) {
            return [];
        }

        return array_values(array_map(
            fn (mixed $row): array => array_combine(
                $keys,
                array_map(fn (string $key) => self::text(is_array($row) ? ($row[$key] ?? null) : null), $keys),
            ),
            array_filter($rows, 'is_array'),
        ));
    }

    private static function text(mixed $value): ?string
    {
        if ($value === null || is_array($value)) {
            return null;
        }

        $value = Str::squish((string) $value);

        return $value === '' ? null : $value;
    }

    private static function integer(mixed $value): ?int
    {
        return is_numeric($value) ? (int) $value : null;
    }

    private static function phone(mixed $value): ?string
    {
        $value = self::text($value);

        return $value === null ? null : CitizenBusinessService::normalizePhone($value);
    }
}
