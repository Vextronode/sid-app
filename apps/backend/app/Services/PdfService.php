<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class PdfService
{
    public function __construct(
        protected OfficialRepository $officialRepository,
        protected LetterRepository $letterRepository,
    ) {}

    public function download(
        Letter $letter,
        User $user,
        string $template = 'wet'
    ): Response {

        $letter = $this->letterRepository->loadForPdf($letter);

        /**
         * EV5-4-S9. Guard generik: hanya bisa download jika status
         * surat sudah 'approved' (bukan lagi KasiApproved granular v4.2
         * - lihat paths/letters/download.yaml).
         */
        if ($letter->status !== LetterStatus::Approved) {
            abort(403, 'Surat baru dapat diunduh setelah seluruh proses persetujuan selesai.');
        }

        if (
            $letter->submitted_by === $user->id &&
            $letter->expires_at &&
            now()->greaterThan($letter->expires_at)
        ) {
            abort(403, 'Masa berlaku surat telah habis.');
        }

        // Tanda tangan dan stempel tetap milik Kepala Desa aktif, termasuk jika Sekdes yang menyetujui surat.
        $kades = $this->officialRepository->findActiveVillageHeadWithCitizenOrFail($letter->village_id);

        /**
         * Check if letterType exists
         */
        if (! $letter->letterType) {
            abort(500, 'Template surat tidak ditemukan. Hubungi administrator.');
        }

        /**
         * Build letter body from LetterType template
         */
        $templateHtml = $this->renderTemplate($letter, $kades, $template);

        $view = match ($template) {
            'digital' => 'pdf.templates.digital',
            default => 'pdf.templates.wet',
        };

        $pdf = Pdf::loadView($view, [
            'letter' => $letter,
            'kades' => $kades,
            'template' => $templateHtml,
        ]);

        return $pdf->download("surat-{$letter->id}.pdf");
    }

    public function preview(
        Letter $letter,
        User $user,
        string $template = 'wet'
    ): Response {

        $letter = $this->letterRepository->loadForPdf($letter);

        $kades = $this->officialRepository->findActiveVillageHeadWithCitizenOrFail($letter->village_id);

        /**
         * Check if letterType exists
         */
        if (! $letter->letterType) {
            abort(500, 'Template surat tidak ditemukan. Hubungi administrator.');
        }

        /**
         * Build letter body from LetterType template
         */
        $templateHtml = $this->renderTemplate($letter, $kades, $template);

        $view = match ($template) {
            'digital' => 'pdf.templates.digital',
            default => 'pdf.templates.wet',
        };

        $pdf = Pdf::loadView($view, [
            'letter' => $letter,
            'kades' => $kades,
            'template' => $templateHtml,
        ]);

        return $pdf->stream("surat-{$letter->id}.pdf");
    }

    private function renderTemplate(Letter $letter, Official $kades, string $template): string
    {
        $replacements = $this->getReplacements($letter, $kades, $template);

        $templateHtml = str_replace(
            array_keys($replacements),
            array_values($replacements),
            $letter->letterType->template
        );

        // Replace any unmapped {{ placeholder }} tags with fallback underline line
        return preg_replace('/\{\{\s*([a-zA-Z0-9_]+)\s*}}/', '________________________', $templateHtml);
    }

    private function getReplacements(Letter $letter, Official $kades, string $template): array
    {
        $citizen = $letter->citizen;
        $gender = '-';
        if ($citizen && $citizen->gender) {
            $gender = $citizen->gender === 'L' ? 'Laki-laki' : ($citizen->gender === 'P' ? 'Perempuan' : $citizen->gender);
        }

        $birthPlaceDate = '-';
        if ($citizen) {
            $pob = $citizen->place_of_birth ?? '';
            $dob = $citizen->date_of_birth ? $citizen->date_of_birth->locale('id')->translatedFormat('d F Y') : '';
            if ($pob && $dob) {
                $birthPlaceDate = "{$pob}, {$dob}";
            } else {
                $birthPlaceDate = $pob ?: ($dob ?: '-');
            }
        }

        $submittedDate = $letter->created_at ? $letter->created_at->locale('id') : now()->locale('id');
        $submittedAtFormatted = $submittedDate->translatedFormat('d F Y');

        $signatureHtml = '';
        $signatureDirectory = "official-signatures/{$kades->village_id}/{$kades->id}/";
        if (
            $template === 'digital'
            && $kades->signature_img
            && str_starts_with($kades->signature_img, $signatureDirectory)
            && Storage::disk('private_uploads')->exists($kades->signature_img)
        ) {
            $signatureHtml .= '<img src="'.Storage::disk('private_uploads')->path($kades->signature_img).'" style="max-height: 60px; width: auto;">';
        }
        $stampDirectory = "village-stamps/{$letter->village_id}/";
        if (
            $letter->village->stamp_img
            && str_starts_with($letter->village->stamp_img, $stampDirectory)
            && Storage::disk('private_uploads')->exists($letter->village->stamp_img)
        ) {
            $signatureHtml .= '<img src="'.Storage::disk('private_uploads')->path($letter->village->stamp_img).'" style="max-height: 45px; width: auto; margin-left: 10px;">';
        }

        $logoPath = public_path('images/logo-pangandaran.png');
        $logoHtml = file_exists($logoPath)
            ? '<img src="'.$logoPath.'" style="width: 75px; height: auto;">'
            : '';

        $replacements = [
            '{{ logo_img }}' => $logoHtml,
            '{{ letter_number }}' => $letter->letter_number ?? '470/      /Des/      /20',
            '{{ applicant_name }}' => $letter->applicant_name ?? '________________________________________',
            '{{ applicant_nik }}' => $letter->applicant_nik ?? '________________________________________',
            '{{ applicant_address }}' => $letter->applicant_address ?? '________________________________________',
            '{{ applicant_gender }}' => $gender,
            '{{ applicant_birth_place_date }}' => $birthPlaceDate,
            '{{ purpose }}' => $letter->purpose ?? '________________________________________',
            '{{ submitted_at }}' => $submittedAtFormatted,
            '{{ village_name }}' => $letter->village->name ?? 'Cibenda',
            '{{ village_name_short }}' => preg_replace('/^Desa\s+/i', '', $letter->village->name ?? 'Cibenda'),
            '{{ village_address }}' => $letter->village->address ?? 'Jl.Raya Cijulang Nomor.173.Tlp.0265.2640613',
            '{{ village_phone }}' => $letter->village->phone ?? '0265.2640613',
            '{{ village_head_name }}' => $kades->citizen->name ?? '________________________________________',
            '{{ signature_img }}' => $signatureHtml,
        ];

        if (! empty($letter->payload) && is_array($letter->payload)) {
            foreach ($letter->payload as $key => $value) {
                if (is_scalar($value) && $value !== null && $value !== '') {
                    $replacements["{{ {$key} }}"] = (string) $value;
                }
            }
        }

        return $replacements;
    }
}
