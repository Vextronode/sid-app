<?php

namespace App\Enums;

/**
 * Tingkat peringatan SIGAP, dari terendah ke tertinggi:
 * info < waspada < siaga < awas. Urutan (rank) menentukan peringatan yang
 * tampil di bar beranda dan kapan notifikasi dikirim ulang (level naik).
 * Daftar menunggu konfirmasi tim SIGAP.
 */
enum DisasterAlertLevel: string
{
    case Info = 'info';
    case Waspada = 'waspada';
    case Siaga = 'siaga';
    case Awas = 'awas';

    public function rank(): int
    {
        return match ($this) {
            self::Info => 1,
            self::Waspada => 2,
            self::Siaga => 3,
            self::Awas => 4,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Info => 'Info',
            self::Waspada => 'Waspada',
            self::Siaga => 'Siaga',
            self::Awas => 'Awas',
        };
    }
}
