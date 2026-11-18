<?php

namespace App\Support;

use Barryvdh\DomPDF\PDF;

/**
 * Ukuran kertas PDF surat. Bawaan A4; F4 (215 x 330 mm, kertas folio
 * kantor desa) untuk surat yang template fisiknya memakai F4, mis. Surat
 * Keterangan Izin Keramaian/Kegiatan beserta formulirnya.
 */
class PaperSize
{
    public const A4 = 'a4';

    public const F4 = 'f4';

    public const ALL = [self::A4, self::F4];

    /** 215 x 330 mm dalam point (1 mm = 72/25,4 pt). */
    private const F4_POINTS = [0.0, 0.0, 609.45, 935.43];

    public static function normalize(mixed $paper): string
    {
        return in_array($paper, self::ALL, true) ? $paper : self::A4;
    }

    /**
     * Atur kertas hanya bila bukan A4 tegak (bawaan view), agar PDF lain
     * tidak berubah.
     */
    public static function apply(PDF $pdf, mixed $paper, string $orientation = 'portrait'): void
    {
        $paper = self::normalize($paper);

        if ($paper === self::A4 && $orientation !== 'landscape') {
            return;
        }

        $pdf->setPaper($paper === self::F4 ? self::F4_POINTS : 'a4', $orientation === 'landscape' ? 'landscape' : 'portrait');
    }
}
