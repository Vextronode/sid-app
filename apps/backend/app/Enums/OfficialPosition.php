<?php

namespace App\Enums;

/**
 * Jabatan yang punya akun dan peran di aplikasi. Jabatan desa tanpa akun
 * (Kasi/Kaur/Staf lain) bukan bagian enum ini: jenisnya dikelola Petugas
 * Desa di tabel official_position_types, dan officials.position menyimpan
 * `code`-nya.
 */
enum OfficialPosition: string
{
    case KepalaDesa = 'kepala_desa';
    case Rt = 'rt';
    case Rw = 'rw';
    case Kadus = 'kadus';
    case KasiPelayanan = 'kasi_pelayanan';
    case KaurTuUmum = 'kaur_tu_umum';
    case PetugasDesa = 'petugas_desa';
    case Sekdes = 'sekdes';

    public function userRole(): UserRole
    {
        return match ($this) {
            self::KepalaDesa => UserRole::KepalaDesa,
            self::Rt => UserRole::Rt,
            self::Rw => UserRole::Rw,
            self::Kadus => UserRole::Kadus,
            self::KasiPelayanan => UserRole::KasiPelayanan,
            self::KaurTuUmum => UserRole::KaurTuUmum,
            self::PetugasDesa => UserRole::PetugasDesa,
            self::Sekdes => UserRole::SekretarisDesa,
        };
    }

    public function scopeColumn(): ?string
    {
        return match ($this) {
            self::Rt => 'rt_id',
            self::Rw => 'rw_id',
            self::Kadus => 'hamlet_id',
            default => null,
        };
    }

    public function isSingleHolderPerScope(): bool
    {
        return $this !== self::PetugasDesa;
    }

    /**
     * @return array<int, string>
     */
    public static function accountPositions(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::KepalaDesa => 'Kepala Desa',
            self::Rt => 'RT',
            self::Rw => 'RW',
            self::Kadus => 'Kepala Dusun',
            self::KasiPelayanan => 'Kasi Pelayanan',
            self::KaurTuUmum => 'Kaur TU & Umum',
            self::PetugasDesa => 'Petugas Desa',
            self::Sekdes => 'Sekretaris Desa',
        };
    }
}
