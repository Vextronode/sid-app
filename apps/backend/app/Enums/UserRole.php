<?php

namespace App\Enums;

use Illuminate\Container\Container;

enum UserRole: string
{
    case Warga = 'warga';
    case Rt = 'rt';
    case Rw = 'rw';
    case Kadus = 'kadus';
    case KasiPelayanan = 'kasi_pelayanan';
    case KaurTuUmum = 'kaur_tu_umum';
    case StafSid = 'staf_sid';
    case KepalaDesa = 'kepala_desa';
    case SekretarisDesa = 'sekretaris_desa';

    private const DEFAULT_APP_NAME = 'SIDUTama';

    /**
     * Label peran staf pemegang aplikasi, mengikuti nama aplikasi yang
     * diatur di config/sid.php (SID_APP_NAME), mis. "Staf SIDUTama".
     */
    public static function stafSidLabel(): string
    {
        // Enum juga dipakai di luar aplikasi Laravel yang sudah boot (mis.
        // unit test murni); saat itu config belum ada, pakai nama bawaan.
        $appName = Container::getInstance()->bound('config')
            ? config('sid.app_name', self::DEFAULT_APP_NAME)
            : self::DEFAULT_APP_NAME;

        return 'Staf '.$appName;
    }

    public function label(): string
    {
        return match ($this) {
            self::Warga => 'Warga',
            self::Rt => 'RT',
            self::Rw => 'RW',
            self::Kadus => 'Kepala Dusun',
            self::KasiPelayanan => 'Kasi Pelayanan',
            self::KaurTuUmum => 'Kaur TU & Umum',
            self::StafSid => self::stafSidLabel(),
            self::KepalaDesa => 'Kepala Desa',
            self::SekretarisDesa => 'Sekretaris Desa',
        };
    }

    public static function middleware(self ...$roles): string
    {
        $values = array_map(fn (self $role) => $role->value, $roles);

        return 'role:'.implode(',', $values);
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(fn (self $role) => $role->value, self::cases());
    }
}
