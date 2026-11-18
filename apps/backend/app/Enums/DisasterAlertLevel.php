<?php

namespace App\Enums;

/**
 * Tingkat peringatan SIGAP, dari terendah ke tertinggi:
 * waspada < siaga < awas (dikonfirmasi SIGAP 2026-11-19; SIGAP tidak
 * mengirim level info/aman). Urutan (rank) menentukan peringatan yang tampil
 * di bar beranda dan kapan notifikasi dikirim ulang (level naik).
 */
enum DisasterAlertLevel: string
{
    case Waspada = 'waspada';
    case Siaga = 'siaga';
    case Awas = 'awas';

    public function rank(): int
    {
        return match ($this) {
            self::Waspada => 1,
            self::Siaga => 2,
            self::Awas => 3,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Waspada => 'Waspada',
            self::Siaga => 'Siaga',
            self::Awas => 'Awas',
        };
    }
}
