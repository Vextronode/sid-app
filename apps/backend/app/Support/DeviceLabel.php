<?php

namespace App\Support;

/**
 * Label perangkat ringkas ("Chrome · Android") dari header User-Agent,
 * dipakai menu Pelanggan Notifikasi. Sengaja hanya browser + OS utama:
 * User-Agent mentah tidak disimpan (minimalisasi data pribadi).
 */
final class DeviceLabel
{
    /** Urutan penting: token yang lebih spesifik dicek lebih dulu. */
    private const BROWSERS = [
        'Edge' => '/\b(Edg|EdgA|EdgiOS)\//',
        'Opera' => '/\b(OPR|OPiOS|Opera)\//',
        'Samsung Internet' => '/\bSamsungBrowser\//',
        'Firefox' => '/\b(Firefox|FxiOS)\//',
        'Chrome' => '/\b(Chrome|CriOS)\//',
        'Safari' => '/\bVersion\/[\d.]+.*\bSafari\//',
    ];

    private const OPERATING_SYSTEMS = [
        'Android' => '/\bAndroid\b/',
        'iOS' => '/\b(iPhone|iPad|iPod)\b/',
        'ChromeOS' => '/\bCrOS\b/',
        'Windows' => '/\bWindows\b/',
        'macOS' => '/\b(Macintosh|Mac OS X)\b/',
        'Linux' => '/\bLinux\b/',
    ];

    public static function fromUserAgent(?string $userAgent): ?string
    {
        $userAgent = trim((string) $userAgent);

        if ($userAgent === '') {
            return null;
        }

        $browser = self::match(self::BROWSERS, $userAgent);
        $os = self::match(self::OPERATING_SYSTEMS, $userAgent);

        if ($browser === null && $os === null) {
            return null;
        }

        return ($browser ?? 'Browser lain').' · '.($os ?? 'OS lain');
    }

    /** @param  array<string, string>  $patterns */
    private static function match(array $patterns, string $userAgent): ?string
    {
        foreach ($patterns as $label => $pattern) {
            if (preg_match($pattern, $userAgent) === 1) {
                return $label;
            }
        }

        return null;
    }
}
