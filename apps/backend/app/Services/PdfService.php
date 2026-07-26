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
        User $user
    ): Response {

        /**
         * Load relasi yang dibutuhkan
         */
        $letter->load([
            'letterType',
            'citizen',
            'village',
        ]);

        /**
         * Guard 1
         * Hanya surat yang sudah disetujui Kasi yang boleh diunduh
         */
        if ($letter->status !== LetterStatus::KasiApproved) {

            abort(
                403,
                'Surat belum dapat diunduh.'
            );
        }

        /**
         * Guard 2
         * Jika role warga dan surat sudah expired
         */
        if (
            $user->role === 'warga'
            && $letter->expires_at
            && now()->greaterThan($letter->expires_at)
        ) {

            abort(
                403,
                'Masa berlaku surat telah habis.'
            );
        }

        /**
         * Ambil Kepala Desa aktif
         */
        $kades = Official::query()
            ->where('position', 'kepala_desa')
            ->where('is_active', true)
            ->whereNull('ended_at')
            ->first();

        if (! $kades) {

            abort(
                404,
                'Kepala Desa aktif tidak ditemukan.'
            );
        }

        /**
         * Generate PDF
         */
        $pdf = Pdf::loadView(
            'pdf.letter',
            [
                'letter' => $letter,
                'kades' => $kades,
            ]
        );

        $pdf->setPaper('A4');

        /**
         * Return binary
         */
        return $pdf->download(
            'surat-' .
            $letter->id .
            '.pdf'
        );
    }
}