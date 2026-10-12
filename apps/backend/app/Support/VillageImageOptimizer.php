<?php

namespace App\Support;

use GdImage;
use Illuminate\Http\UploadedFile;

/**
 * Mengecilkan logo dan foto hero desa sebelum disimpan. Keduanya tampil di
 * atas lipatan halaman publik, sedangkan unggahan boleh sampai 2 MB (logo)
 * dan 5 MB (hero); foto HP mentah membuat beranda lambat dimuat.
 *
 * - Diperkecil proporsional (tidak pernah diperbesar) sampai sisi
 *   terpanjangnya MAX_SIDE piksel.
 * - Rotasi EXIF (foto HP) diterapkan dulu, karena EXIF hilang saat disimpan
 *   ulang. Ekstensi exif tidak terpasang, jadi tag Orientation dibaca sendiri.
 * - Disimpan sebagai WebP bila GD mendukungnya; bila tidak, hero JPEG dan
 *   logo PNG (transparansi logo tetap).
 * - Bila gambar tidak bisa diproses (format tak dikenal, atau terlalu besar
 *   untuk didekode dalam batas memori), berkas asli dipakai apa adanya,
 *   sama seperti sebelum ada optimasi.
 */
class VillageImageOptimizer
{
    public const MAX_SIDE = [
        'logo' => 512,
        'hero_image' => 1920,
    ];

    private const QUALITY = 82;

    /** Perkiraan byte memori per piksel saat GD mendekode gambar truecolor. */
    private const BYTES_PER_PIXEL = 5;

    /** Cadangan memori untuk encode dan sisa proses request. */
    private const MEMORY_HEADROOM = 16 * 1024 * 1024;

    /**
     * Batas memori selama memproses gambar. Foto HP 12 MP butuh ±60 MB untuk
     * didekode, terlalu mepet dengan memory_limit bawaan 128 MB; batasnya
     * dikembalikan setelah selesai.
     */
    private const WORKING_MEMORY_LIMIT = 256 * 1024 * 1024;

    /**
     * @return array{contents: string, extension: string}
     */
    public function optimize(UploadedFile $file, string $column): array
    {
        $original = [
            'contents' => (string) file_get_contents($file->getRealPath()),
            'extension' => $file->guessExtension() ?: $file->getClientOriginalExtension(),
        ];

        $previousLimit = (string) ini_get('memory_limit');
        $limit = $this->bytes($previousLimit);
        if ($limit > 0 && $limit < self::WORKING_MEMORY_LIMIT) {
            ini_set('memory_limit', (string) self::WORKING_MEMORY_LIMIT);
        }

        try {
            return $this->process($original, $column);
        } finally {
            ini_set('memory_limit', $previousLimit);
        }
    }

    /**
     * @param  array{contents: string, extension: string}  $original
     * @return array{contents: string, extension: string}
     */
    private function process(array $original, string $column): array
    {
        $info = @getimagesizefromstring($original['contents']);
        $maxSide = self::MAX_SIDE[$column] ?? self::MAX_SIDE['hero_image'];
        if ($info === false || ! $this->fitsInMemory($info[0], $info[1], $maxSide)) {
            return $original;
        }

        $source = @imagecreatefromstring($original['contents']);
        if (! $source instanceof GdImage) {
            return $original;
        }

        $orientation = $info[2] === IMAGETYPE_JPEG ? $this->jpegOrientation($original['contents']) : 1;
        $width = imagesx($source);
        $height = imagesy($source);
        $needsResize = max($width, $height) > $maxSide;
        $format = $this->outputFormat($column);

        // Sudah kecil, tegak, dan berformat tujuan: tidak perlu disimpan ulang.
        if (! $needsResize && $orientation === 1 && $info[2] === $format['type']) {
            imagedestroy($source);

            return $original;
        }

        // Perkecil dulu, baru putar: memutar gambar kecil jauh lebih hemat memori.
        $image = $this->resize($source, $maxSide, $format['type'] !== IMAGETYPE_JPEG);
        $image = $this->applyOrientation($image, $orientation);

        $contents = $this->encode($image, $format['type']);
        imagedestroy($image);

        return $contents === null ? $original : ['contents' => $contents, 'extension' => $format['extension']];
    }

    /**
     * @return array{type: int, extension: string}
     */
    private function outputFormat(string $column): array
    {
        if (function_exists('imagewebp') && (gd_info()['WebP Support'] ?? false)) {
            return ['type' => IMAGETYPE_WEBP, 'extension' => 'webp'];
        }

        return $column === 'logo'
            ? ['type' => IMAGETYPE_PNG, 'extension' => 'png']
            : ['type' => IMAGETYPE_JPEG, 'extension' => 'jpg'];
    }

    /**
     * Cukupkah memori untuk gambar sumber dan kanvas tujuan sekaligus? Bila
     * tidak, GD akan memicu fatal error yang tidak bisa ditangkap, jadi lebih
     * baik berkas asli disimpan apa adanya.
     */
    private function fitsInMemory(int $width, int $height, int $maxSide): bool
    {
        $limit = $this->bytes((string) ini_get('memory_limit'));
        if ($limit <= 0) {
            return true;
        }

        $scale = min(1, $maxSide / max($width, $height, 1));
        $pixels = $width * $height + (int) ceil($width * $scale) * (int) ceil($height * $scale);

        return $pixels * self::BYTES_PER_PIXEL + self::MEMORY_HEADROOM < $limit - memory_get_usage(true);
    }

    private function bytes(string $value): int
    {
        $value = trim($value);
        $number = (int) $value;

        return match (strtolower(substr($value, -1))) {
            'g' => $number * 1024 ** 3,
            'm' => $number * 1024 ** 2,
            'k' => $number * 1024,
            default => $number,
        };
    }

    /**
     * Salin ke kanvas baru berukuran tujuan. Kanvas selalu baru (juga tanpa
     * perkecilan) agar gambar palet/PNG menjadi truecolor yang bisa di-encode
     * ke WebP. Tanpa alpha (JPEG), latar transparan diisi putih.
     */
    private function resize(GdImage $source, int $maxSide, bool $keepAlpha): GdImage
    {
        $width = imagesx($source);
        $height = imagesy($source);
        $scale = min(1, $maxSide / max($width, $height));
        $newWidth = max(1, (int) round($width * $scale));
        $newHeight = max(1, (int) round($height * $scale));

        $canvas = imagecreatetruecolor($newWidth, $newHeight);
        if ($keepAlpha) {
            imagealphablending($canvas, false);
            imagesavealpha($canvas, true);
            imagefill($canvas, 0, 0, imagecolorallocatealpha($canvas, 0, 0, 0, 127));
        } else {
            imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
        }

        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        imagedestroy($source);

        return $canvas;
    }

    private function applyOrientation(GdImage $image, int $orientation): GdImage
    {
        if (in_array($orientation, [2, 5, 7], true)) {
            imageflip($image, $orientation === 5 ? IMG_FLIP_VERTICAL : IMG_FLIP_HORIZONTAL);
        }
        if ($orientation === 4) {
            imageflip($image, IMG_FLIP_VERTICAL);
        }

        // imagerotate memutar berlawanan arah jarum jam.
        $angle = match ($orientation) {
            3 => 180,
            5, 6, 7 => -90,
            8 => 90,
            default => 0,
        };
        if ($angle === 0) {
            return $image;
        }

        $transparent = imagecolorallocatealpha($image, 0, 0, 0, 127);
        $rotated = imagerotate($image, $angle, $transparent);
        if (! $rotated instanceof GdImage) {
            return $image;
        }

        imagedestroy($image);
        imagealphablending($rotated, false);
        imagesavealpha($rotated, true);

        return $rotated;
    }

    private function encode(GdImage $image, int $type): ?string
    {
        ob_start();
        $ok = match ($type) {
            IMAGETYPE_WEBP => imagewebp($image, null, self::QUALITY),
            IMAGETYPE_PNG => imagepng($image, null, 9),
            default => imagejpeg($image, null, self::QUALITY),
        };
        $contents = ob_get_clean();

        return $ok && $contents !== false && $contents !== '' ? $contents : null;
    }

    /**
     * Nilai tag EXIF Orientation (0x0112) dari segmen APP1 JPEG; 1 bila tidak
     * ada atau tidak terbaca.
     */
    private function jpegOrientation(string $bytes): int
    {
        $length = strlen($bytes);
        $offset = 2; // lewati penanda SOI (FF D8)

        while ($offset + 4 <= $length && ord($bytes[$offset]) === 0xFF) {
            $marker = ord($bytes[$offset + 1]);
            if ($marker === 0xDA) {
                break; // awal data gambar; EXIF selalu sebelum ini
            }

            $segmentLength = unpack('n', substr($bytes, $offset + 2, 2))[1];
            if ($marker === 0xE1 && substr($bytes, $offset + 4, 6) === "Exif\0\0") {
                return $this->tiffOrientation(substr($bytes, $offset + 10, $segmentLength - 8));
            }

            $offset += 2 + $segmentLength;
        }

        return 1;
    }

    private function tiffOrientation(string $tiff): int
    {
        if (strlen($tiff) < 8) {
            return 1;
        }

        $little = substr($tiff, 0, 2) === 'II';
        $u16 = fn (int $at): ?int => $at + 2 <= strlen($tiff) ? unpack($little ? 'v' : 'n', substr($tiff, $at, 2))[1] : null;
        $u32 = fn (int $at): ?int => $at + 4 <= strlen($tiff) ? unpack($little ? 'V' : 'N', substr($tiff, $at, 4))[1] : null;

        $ifd = $u32(4);
        $entries = $ifd === null ? null : $u16($ifd);
        if ($entries === null) {
            return 1;
        }

        for ($i = 0; $i < $entries; $i++) {
            $entry = $ifd + 2 + $i * 12;
            if ($u16($entry) === 0x0112) {
                $value = $u16($entry + 8);

                return $value !== null && $value >= 1 && $value <= 8 ? $value : 1;
            }
        }

        return 1;
    }
}
