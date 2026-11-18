<?php

namespace App\Support;

use setasign\Fpdi\Fpdi;
use setasign\Fpdi\PdfParser\StreamReader;

/**
 * Memindahkan PDF surat ke ukuran kertas lain tanpa merender ulang: tiap
 * halaman (dirender di kertas bawaan template) ditempel utuh ke kertas
 * tujuan dengan skala seragam lalu diletakkan di tengah, seperti "fit to
 * page" saat mencetak. Tata letak dan pemenggalan halaman tetap sama;
 * sisa ruang karena beda rasio A4/F4 dibagi rata di kedua sisi.
 * Hasilnya tetap vektor (teks dapat diseleksi).
 *
 * F4 -> A4: skala ~90% (dibatasi tinggi), sisa ~8 mm kiri dan kanan.
 * A4 -> F4: skala ~102,4% (dibatasi lebar), sisa ~13 mm atas dan bawah.
 */
class PdfRescaler
{
    public static function rescale(string $pdf, string $targetPaper): string
    {
        $output = new Fpdi('P', 'mm');
        $output->SetAutoPageBreak(false);
        $output->SetMargins(0, 0, 0);

        $pageCount = $output->setSourceFile(StreamReader::createByString($pdf));

        for ($page = 1; $page <= $pageCount; $page++) {
            $template = $output->importPage($page);
            $source = $output->getTemplateSize($template);
            $landscape = $source['width'] > $source['height'];
            [$width, $height] = PaperSize::dimensionsMm($targetPaper, $landscape);
            $scale = min($width / $source['width'], $height / $source['height']);
            $scaledWidth = $source['width'] * $scale;
            $scaledHeight = $source['height'] * $scale;

            $output->AddPage($landscape ? 'L' : 'P', [$width, $height]);
            $output->useTemplate(
                $template,
                ($width - $scaledWidth) / 2,
                ($height - $scaledHeight) / 2,
                $scaledWidth,
                $scaledHeight,
            );
        }

        return $output->Output('S');
    }
}
