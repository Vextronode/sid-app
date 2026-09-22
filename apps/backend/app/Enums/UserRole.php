<?php

namespace App\Enums;

enum UserRole: string
{
    case Warga = 'warga';
    case Rt = 'rt';
    case Rw = 'rw';
    case Kadus = 'kadus';
    case KasiPelayanan = 'kasi_pelayanan';
    case KaurTuUmum = 'kaur_tu_umum';
    case PetugasDesa = 'petugas_desa';
    case KepalaDesa = 'kepala_desa';
    case SekretarisDesa = 'sekretaris_desa';

    public function label(): string
    {
        return match ($this) {
            self::Warga => 'Warga',
            self::Rt => 'RT',
            self::Rw => 'RW',
            self::Kadus => 'Kepala Dusun',
            self::KasiPelayanan => 'Kasi Pelayanan',
            self::KaurTuUmum => 'Kaur TU & Umum',
            self::PetugasDesa => 'Petugas Desa',
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
