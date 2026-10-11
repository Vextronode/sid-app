<?php

namespace App\Support;

use Closure;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Cache respons halaman publik (beranda, profil desa, berita, tipe surat,
 * peraturan, kontak) per desa. Yang disimpan adalah JSON respons akhir,
 * bukan model, karena cache.serializable_classes dimatikan.
 *
 * Kunci memuat versi per desa: flush() cukup mengganti versinya sehingga
 * seluruh bagian desa itu langsung kedaluwarsa tanpa perlu tahu daftar
 * kuncinya; entri versi lama habis sendiri lewat TTL.
 */
class PublicPageCache
{
    private const TTL_SECONDS = 600;

    /**
     * @param  Closure(): string  $build  penghasil JSON respons
     */
    public static function remember(string $villageId, string $section, Closure $build): string
    {
        $version = Cache::get(self::versionKey($villageId), '0');

        return Cache::remember(
            "public-page:{$villageId}:{$version}:{$section}",
            self::TTL_SECONDS,
            $build,
        );
    }

    public static function flush(?string $villageId): void
    {
        if ($villageId === null) {
            return;
        }

        Cache::forever(self::versionKey($villageId), (string) Str::uuid());
    }

    private static function versionKey(string $villageId): string
    {
        return "public-page:{$villageId}:version";
    }
}
