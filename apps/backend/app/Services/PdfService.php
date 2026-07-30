<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

class PdfService
{
    public function download(
        Letter $letter,
        User $user,
        string $template = 'wet'
    ): Response {

        $letter->load([
            'letterType',
            'citizen',
            'village',
        ]);

        /**
         * Guard: Hanya bisa download jika sudah RW Approved atau lebih tinggi
         */
        $allowedStatuses = [
            LetterStatus::RwApproved,
            LetterStatus::KadusApproved,
            LetterStatus::KasiApproved,
        ];
        
        if (!in_array($letter->status, $allowedStatuses)) {
            abort(403, 'Surat baru dapat diunduh setelah disetujui oleh RW.');
        }

        if (
            $user->role === 'warga' &&
            $letter->expires_at &&
            now()->greaterThan($letter->expires_at)
        ) {
            abort(403, 'Masa berlaku surat telah habis.');
        }

        /**
         * Kepala Desa aktif
         */
        $kades = Official::query()
            ->where('position', 'kepala_desa')
            ->where('is_active', true)
            ->whereNull('ended_at')
            ->firstOrFail();

        /**
         * Check if letterType exists
         */
        if (!$letter->letterType) {
            abort(500, 'Template surat tidak ditemukan. Hubungi administrator.');
        }

        /**
         * Build letter body from LetterType template
         */
        $replacements = $this->getReplacements($letter, $kades);

        $templateHtml = str_replace(
            array_keys($replacements),
            array_values($replacements),
            $letter->letterType->template
        );
        $view = match ($template) {
            'digital' => 'pdf.templates.digital',
            default   => 'pdf.templates.wet',
        };

        $pdf = Pdf::loadView($view, [
            'letter'   => $letter,
            'kades'    => $kades,
            'template' => $templateHtml,
        ]);

        return $pdf->download("surat-{$letter->id}.pdf");
    }

    public function preview(
        Letter $letter,
        User $user,
        string $template = 'wet'
    ): Response {

        $letter->load([
            'letterType',
            'citizen',
            'village',
        ]);

        /**
         * Kepala Desa aktif
         */
        $kades = Official::query()
            ->where('position', 'kepala_desa')
            ->where('is_active', true)
            ->whereNull('ended_at')
            ->firstOrFail();

        /**
         * Check if letterType exists
         */
        if (!$letter->letterType) {
            abort(500, 'Template surat tidak ditemukan. Hubungi administrator.');
        }

        /**
         * Build letter body from LetterType template
         */
        $replacements = $this->getReplacements($letter, $kades);

        $templateHtml = str_replace(
            array_keys($replacements),
            array_values($replacements),
            $letter->letterType->template
        );
        $view = match ($template) {
            'digital' => 'pdf.templates.digital',
            default   => 'pdf.templates.wet',
        };

        $pdf = Pdf::loadView($view, [
            'letter'   => $letter,
            'kades'    => $kades,
            'template' => $templateHtml,
        ]);

        return $pdf->stream("surat-{$letter->id}.pdf");
    }

    private function getReplacements(Letter $letter, Official $kades): array
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
        if ($kades->signature_img) {
            $signatureHtml .= '<img src="' . public_path('storage/' . $kades->signature_img) . '" style="max-height: 45px; width: auto;">';
        }
        if ($kades->stamp_img) {
            $signatureHtml .= '<img src="' . public_path('storage/' . $kades->stamp_img) . '" style="max-height: 45px; width: auto; margin-left: 10px;">';
        }

        return [
            '{{ letter_number }}'              => $letter->letter_number ?? '470/      /Des/      /20',
            '{{ applicant_name }}'             => $letter->applicant_name ?? '________________________________________',
            '{{ applicant_nik }}'              => $letter->applicant_nik ?? '________________________________________',
            '{{ applicant_address }}'          => $letter->applicant_address ?? '________________________________________',
            '{{ applicant_gender }}'           => $gender,
            '{{ applicant_birth_place_date }}' => $birthPlaceDate,
            '{{ purpose }}'                    => $letter->purpose ?? '________________________________________',
            '{{ submitted_at }}'               => $submittedAtFormatted,
            '{{ village_name }}'               => $letter->village->name ?? 'Cibenda',
            '{{ village_address }}'            => $letter->village->address ?? 'Jl.Raya Cijulang Nomor.173.Tlp.0265.2640613',
            '{{ village_phone }}'              => $letter->village->phone ?? '0265.2640613',
            '{{ village_head_name }}'          => $kades->citizen->full_name ?? '________________________________________',
            '{{ signature_img }}'              => $signatureHtml,
        ];
    }
}