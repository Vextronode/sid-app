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
         * Guard
         */
        if ($letter->status !== LetterStatus::KasiApproved) {
            abort(403, 'Surat belum dapat diunduh.');
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
         * Build letter body from LetterType template
         */
        $replacements = [
            '{{ letter_number }}'     => $letter->letter_number,
            '{{ applicant_name }}'    => $letter->applicant_name,
            '{{ applicant_nik }}'     => $letter->applicant_nik,
            '{{ applicant_address }}' => $letter->applicant_address,
            '{{ purpose }}'           => $letter->purpose,
            '{{ submitted_at }}'      => $letter->created_at?->translatedFormat('d F Y') ?? now()->translatedFormat('d F Y'),
            '{{ village_name }}'      => $letter->village->name,
            '{{ village_address }}'  => $letter->village->address ?? '-',
            '{{ village_phone }}'    => $letter->village->phone ?? '-',
            '{{ village_head_name }}' => $kades->citizen->full_name,
            
        ];

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
}