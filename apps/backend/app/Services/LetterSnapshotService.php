<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Enums\ResidencyType;
use App\Models\Letter;
use App\Models\Official;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;

/**
 * Membekukan data yang dipakai untuk merender surat pada saat final
 * approve. Tanpa ini PDF dirender ulang dari data hidup setiap kali
 * diunduh, sehingga surat lama ikut berubah ketika Kades berganti, TTD
 * diganti, template diedit, atau data warga diperbarui.
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
            return $this->build($letter, $this->activeVillageHeadOrFail($letter));
        }

        return $letter->snapshot ?? $this->capture($letter, $this->activeVillageHeadOrFail($letter));
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
        $kades = $this->officialRepository->findActiveVillageHeadWithCitizen($letter->village_id);

        if ($kades !== null) {
            $this->capture($letter, $kades);
        }
    }

    public function signerFor(Letter $letter, array $context): Official
    {
        $official = $this->officialRepository->find((int) $context['signer']['official_id']);

        if ($official === null) {
            abort(500, 'Data penanda tangan surat tidak ditemukan. Hubungi administrator.');
        }

        return $official->loadMissing('citizen.occupation');
    }

    /**
     * @return array<string, mixed>
     */
    private function capture(Letter $letter, Official $kades): array
    {
        $snapshot = $this->build($letter, $kades);

        $this->letterRepository->update($letter, [
            'snapshot' => $snapshot,
            'signed_by_official_id' => $kades->id,
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
            'template' => $letter->letterType?->template,
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
            ],
            'village' => [
                'name' => $letter->village?->name,
                'address' => $letter->village?->address,
                'phone' => $letter->village?->phone,
                'district' => $letter->village?->district,
                'regency' => $letter->village?->regency,
                'province' => $letter->village?->province,
                'postal_code' => $letter->village?->postal_code,
                'email' => $letter->village?->email,
                'stamp_img' => $letter->village?->stamp_img,
            ],
            'signer' => [
                'official_id' => $kades?->id,
                'village_id' => $kades?->village_id,
                'name' => $kades?->citizen?->name,
                'signature_img' => $kades?->signature_img,
            ],
        ];
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
