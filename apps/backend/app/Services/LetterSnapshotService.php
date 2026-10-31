<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Enums\OfficialPosition;
use App\Enums\ResidencyType;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;
use App\Support\CitizenLabels;
use App\Support\LetterFormSchema;

/**
 * Membekukan data yang dipakai untuk merender surat pada saat final
 * approve. Tanpa ini PDF dirender ulang dari data hidup setiap kali
 * diunduh, sehingga surat lama ikut berubah ketika Kades berganti,
 * template diedit, atau data warga diperbarui.
 */
class LetterSnapshotService
{
    public function __construct(
        protected OfficialRepository $officialRepository,
        protected LetterRepository $letterRepository,
    ) {}

    /**
     * Konteks render untuk sebuah surat. Surat approved selalu memakai
     * snapshot (dibuat saat itu juga bila belum ada, mis. surat yang
     * disetujui sebelum fitur ini ada); surat lain memakai data hidup.
     *
     * @return array<string, mixed>
     */
    public function contextFor(Letter $letter): array
    {
        if ($letter->status !== LetterStatus::Approved) {
            return $this->build($letter, $this->signerOrFail($letter));
        }

        return $letter->snapshot ?? $this->capture($letter, $this->signerOrFail($letter));
    }

    /**
     * Konteks untuk dokumen pendukung. Dokumen ini tidak ditandatangani
     * Kepala Desa, sehingga tetap dapat dirender walau jabatan itu kosong.
     *
     * @return array<string, mixed>
     */
    public function supportingContextFor(Letter $letter): array
    {
        if ($letter->status === LetterStatus::Approved && $letter->snapshot !== null) {
            return $letter->snapshot;
        }

        return $this->build(
            $letter,
            $this->officialRepository->findActiveVillageHeadWithCitizen($letter->village_id),
        );
    }

    /**
     * Dipanggil saat final approve. Tanda tangan dan stempel tetap milik
     * Kepala Desa yang menjabat saat itu, termasuk bila Sekdes yang
     * menyetujui. Bila belum ada Kepala Desa aktif, snapshot ditunda
     * sampai unduhan pertama.
     */
    public function captureOnFinalApproval(Letter $letter): void
    {
        if (! $this->signedByVillageHead($letter)) {
            $this->capture($letter, null);

            return;
        }

        $kades = $this->officialRepository->findActiveVillageHeadWithCitizen($letter->village_id);

        if ($kades !== null) {
            $this->capture($letter, $kades);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function capture(Letter $letter, ?Official $kades): array
    {
        $snapshot = $this->build($letter, $kades);

        $this->letterRepository->update($letter, [
            'snapshot' => $snapshot,
            'signed_by_official_id' => $kades?->id,
        ]);

        return $snapshot;
    }

    /**
     * @return array<string, mixed>
     */
    private function build(Letter $letter, ?Official $kades): array
    {
        $letter = $this->letterRepository->loadForPdf($letter);
        $citizen = $letter->citizen;
        $submittedAt = ($letter->created_at ?? now())->locale('id');

        return [
            'captured_at' => now()->toIso8601String(),
            'title' => $letter->letterType?->name,
            'template' => $letter->letterType?->template,
            'documents' => $letter->letterType?->documents ?? [],
            'supporting_template' => $letter->letterType?->supporting_template,
            'submitted_at' => $submittedAt->translatedFormat('d F Y'),
            // Tanggal surat = tanggal persetujuan akhir.
            'issued_at' => ($letter->status === LetterStatus::Approved && $letter->processed_at
                ? $letter->processed_at
                : now())->locale('id')->translatedFormat('j F Y'),
            // Definisi isian ikut dibekukan agar format nilai (tanggal,
            // rupiah, pilihan) di surat lama tidak berubah.
            'form_fields' => $letter->letterType?->form_fields ?? [],
            'applicant' => [
                'gender' => $this->genderLabel($citizen?->gender),
                'birth_place_date' => $this->birthPlaceDate($citizen),
                'resident_phrase' => $this->residentPhrase($citizen),
                'occupation' => $citizen?->occupation?->name ?: '-',
                'marital_status' => $citizen?->marital_status
                    ? CitizenLabels::of(CitizenLabels::MARITAL_STATUS, $citizen->marital_status)
                    : '-',
                'family_number' => $citizen?->family?->no_kk,
                'email' => $letter->user?->email,
                // Rincian KK pemohon untuk formulir pelayanan ({{#each kk_anggota}}).
                'family_members' => $citizen === null ? [] : (new LetterFormSchema(null, $citizen))
                    ->familyMembers()
                    ->map(fn ($member): array => [
                        'nama' => $member->name,
                        'nik' => $member->nik,
                        'shdk' => LetterFormSchema::familyRoleLabel($member->family_role),
                    ])
                    ->values()
                    ->all(),
            ],
            'village' => [
                'name' => $letter->village?->name,
                'code' => $letter->village?->code,
                'address' => $letter->village?->address,
                'phone' => $letter->village?->phone,
                'district' => $letter->village?->district,
                'regency' => $letter->village?->regency,
                'province' => $letter->village?->province,
                'postal_code' => $letter->village?->postal_code,
                'area_code' => $letter->village?->area_code,
                'email' => $letter->village?->email,
                // Petugas pada formulir F-1.02.
                'kasi_pemerintahan_name' => $this->officialRepository
                    ->findActiveByPositionWithCitizen($letter->village_id, OfficialPosition::KasiPemerintahan->value)
                    ?->citizen?->name,
            ],
            'service_officials' => $this->serviceOfficials($letter),
            'signer' => [
                'official_id' => $kades?->id,
                'village_id' => $kades?->village_id,
                'name' => $kades?->citizen?->name,
            ],
        ];
    }

    /**
     * Pejabat yang namanya tercetak pada formulir pelayanan (Fxx): Kepala
     * Desa serta Ketua RT/RW wilayah tiap isian village_area. Dibekukan
     * bersama snapshot saat final approve; TTD-nya dibubuhkan basah.
     *
     * @return array<string, mixed>
     */
    private function serviceOfficials(Letter $letter): array
    {
        if ($this->signedByVillageHead($letter)) {
            return [];
        }

        $areas = [];

        foreach ($letter->letterType?->form_fields ?? [] as $field) {
            $rtId = ($field['type'] ?? null) === 'village_area' ? ($letter->payload[$field['name']] ?? null) : null;
            $rt = is_numeric($rtId) ? Rt::query()->find((int) $rtId) : null;

            if ($rt !== null) {
                $areas[$field['name']] = [
                    'rt' => $this->officialOf($this->officialRepository->findActiveRtByRtId($rt->id)),
                    'rw' => $this->officialOf($rt->rw_id ? $this->officialRepository->findActiveRwByRwId($rt->rw_id) : null),
                ];
            }
        }

        return [
            'kepala_desa' => $this->officialOf($this->officialRepository->findActiveVillageHeadWithCitizen($letter->village_id)),
            'areas' => $areas,
        ];
    }

    /**
     * @return array{official_id: int, name: ?string, nik: ?string}|null
     */
    private function officialOf(?Official $official): ?array
    {
        return $official === null ? null : [
            'official_id' => $official->id,
            'name' => $official->citizen?->name,
            'nik' => $official->citizen?->nik,
        ];
    }

    /**
     * Formulir pelayanan (Fxx) tidak ditandatangani Kepala Desa, jadi
     * dapat dirender tanpa Kepala Desa aktif.
     */
    private function signerOrFail(Letter $letter): ?Official
    {
        return $this->signedByVillageHead($letter) ? $this->activeVillageHeadOrFail($letter) : null;
    }

    private function signedByVillageHead(Letter $letter): bool
    {
        return $letter->loadMissing('letterType')->letterType?->signed_by_village_head ?? true;
    }

    private function activeVillageHeadOrFail(Letter $letter): Official
    {
        return $this->officialRepository->findActiveVillageHeadWithCitizenOrFail($letter->village_id);
    }

    /**
     * Pembuka keterangan domisili: pendatang bukan warga desa, tetapi
     * berdomisili di desa; selain itu pemohon adalah warga desa.
     */
    private function residentPhrase(mixed $citizen): string
    {
        return $citizen?->residency_type === ResidencyType::PENDATANG
            ? 'bukan warga masyarakat Desa kami, namun'
            : 'benar-benar warga masyarakat Desa kami, dan';
    }

    private function genderLabel(?string $gender): string
    {
        return match ($gender) {
            'L' => 'Laki-laki',
            'P' => 'Perempuan',
            null, '' => '-',
            default => $gender,
        };
    }

    private function birthPlaceDate(mixed $citizen): string
    {
        if (! $citizen) {
            return '-';
        }

        $place = $citizen->place_of_birth ?? '';
        $date = $citizen->date_of_birth
            ? $citizen->date_of_birth->locale('id')->translatedFormat('d F Y')
            : '';

        if ($place && $date) {
            return "{$place}, {$date}";
        }

        return $place ?: ($date ?: '-');
    }
}
