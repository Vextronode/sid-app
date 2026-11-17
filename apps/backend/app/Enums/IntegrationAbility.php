<?php

namespace App\Enums;

/**
 * Hak akses token client integrasi (Sanctum abilities). Kode dipakai di
 * route (`abilities:...`) dan dijamin tetap di API v1; label untuk menu
 * Integrasi.
 */
enum IntegrationAbility: string
{
    case SellerApplicationsRead = 'seller-applications:read';
    case SellerApplicationsUpdate = 'seller-applications:update';
    case AlertsWrite = 'alerts:write';

    public function label(): string
    {
        return match ($this) {
            self::SellerApplicationsRead => 'Membaca permohonan pedagang',
            self::SellerApplicationsUpdate => 'Melaporkan hasil permohonan pedagang',
            self::AlertsWrite => 'Mengirim peringatan bencana',
        };
    }

    /** Middleware route yang mewajibkan semua ability ini pada token. */
    public static function middleware(self ...$abilities): string
    {
        return 'abilities:'.implode(',', array_map(fn (self $ability) => $ability->value, $abilities));
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $ability) => $ability->value, self::cases());
    }
}
