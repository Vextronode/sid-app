<?php

namespace App\Enums;

/**
 * Jenis bencana pada peringatan SIGAP (disaster_alerts.type). Daftar ini
 * menunggu konfirmasi tim SIGAP (docs/thirdparty/sigap/sid-sigap.md bagian
 * 12); kode dipakai di kontrak API.
 */
enum DisasterAlertType: string
{
    case Gempa = 'gempa';
    case Tsunami = 'tsunami';

    public function label(): string
    {
        return match ($this) {
            self::Gempa => 'Gempa',
            self::Tsunami => 'Tsunami',
        };
    }
}
