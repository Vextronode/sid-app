<?php

namespace App\Support;

use Barryvdh\DomPDF\PDF;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

    /** Lebar x tinggi tegak dalam mm. */
    private const DIMENSIONS_MM = [
        self::A4 => [210.0, 297.0],
        self::F4 => [215.0, 330.0],
    ];

    public static function normalize(mixed $paper): string
    {
        return in_array($paper, self::ALL, true) ? $paper : self::A4;
    }

    /**
     * Ukuran kertas pilihan pengunduh (?paper=a4|f4) untuk PDF surat,
     * dokumen pendukung, dan formulir isi tangan. Null = kertas bawaan
     * dokumen; nilai lain ditolak 422.
     */
    public static function requested(Request $request): ?string
    {
        return $request->validate([
            'paper' => ['nullable', Rule::in(self::ALL)],
        ])['paper'] ?? null;
    }

    /**
     * Ukuran kertas (mm) dengan arah yang sama seperti halaman sumber:
     * halaman mendatar menghasilkan kertas mendatar.
     *
     * @return array{0: float, 1: float} lebar, tinggi
     */
    public static function dimensionsMm(string $paper, bool $landscape = false): array
    {
        [$width, $height] = self::DIMENSIONS_MM[self::normalize($paper)];

        return $landscape ? [$height, $width] : [$width, $height];
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
