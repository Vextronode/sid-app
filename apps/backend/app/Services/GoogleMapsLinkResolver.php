<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Mengambil titik (latitude, longitude) dari link Google Maps yang ditempel
 * Petugas Desa: link panjang (koordinat ada di URL) atau short link
 * maps.app.goo.gl (koordinat baru terlihat setelah redirect).
 *
 * Hanya host Google Maps yang dihubungi, termasuk di setiap redirect, agar
 * endpoint ini tidak bisa dipakai untuk mengakses alamat lain (SSRF). Isi
 * respons tidak pernah dibaca; yang dipakai hanya header Location.
 */
class GoogleMapsLinkResolver
{
    private const MAX_REDIRECTS = 5;

    private const TIMEOUT_SECONDS = 5;

    /**
     * @return array{latitude: float, longitude: float}|null
     */
    public function resolve(string $url): ?array
    {
        for ($hop = 0; $hop <= self::MAX_REDIRECTS; $hop++) {
            if (! $this->isAllowed($url)) {
                return null;
            }

            // Link panjang (atau tujuan redirect) yang sudah memuat titiknya
            // tidak perlu dibuka.
            if ($coords = $this->extract($url)) {
                return $coords;
            }

            if ($hop === self::MAX_REDIRECTS) {
                return null;
            }

            try {
                $response = Http::withoutRedirecting()
                    ->timeout(self::TIMEOUT_SECONDS)
                    ->get($url);
            } catch (ConnectionException) {
                return null;
            }

            $location = $response->header('Location');

            if (! $response->redirect() || $location === '') {
                return null;
            }

            $url = $this->absolute($location, $url);
        }

        return null;
    }

    private function isAllowed(string $url): bool
    {
        $parts = parse_url($url);
        $host = strtolower($parts['host'] ?? '');
        $path = $parts['path'] ?? '/';

        if (($parts['scheme'] ?? '') !== 'https' || isset($parts['user']) || isset($parts['port'])) {
            return false;
        }

        return match ($host) {
            'maps.app.goo.gl' => true,
            'goo.gl' => str_starts_with($path, '/maps/'),
            'google.com', 'www.google.com', 'maps.google.com' => str_starts_with($path, '/maps'),
            // Halaman persetujuan cookie Google; titiknya ada di parameter
            // continue dan diambil tanpa membuka halamannya.
            'consent.google.com' => true,
            default => false,
        };
    }

    /**
     * @return array{latitude: float, longitude: float}|null
     */
    private function extract(string $url): ?array
    {
        $decoded = rawurldecode($url);

        $patterns = [
            // Pin tempat; lebih tepat daripada pusat tampilan (@).
            '/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/',
            '/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/',
            '/[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?)(?:,|\+|\s)+(-?\d+(?:\.\d+)?)/',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $decoded, $match)) {
                $latitude = (float) $match[1];
                $longitude = (float) $match[2];

                if (abs($latitude) <= 90 && abs($longitude) <= 180) {
                    return ['latitude' => $latitude, 'longitude' => $longitude];
                }
            }
        }

        return null;
    }

    private function absolute(string $location, string $base): string
    {
        if (preg_match('#^https?://#i', $location)) {
            return $location;
        }

        $parts = parse_url($base);

        return 'https://'.($parts['host'] ?? '').'/'.ltrim($location, '/');
    }
}
