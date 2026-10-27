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
    case KasiPemerintahan = 'kasi_pemerintahan';
    case KaurTuUmum = 'kaur_tu_umum';
    case StafSid = 'staf_sid';
    case SekretarisDesa = 'sekretaris_desa';

    public function userRole(): UserRole
    {
        return match ($this) {
            self::KepalaDesa => UserRole::KepalaDesa,
            self::Rt => UserRole::Rt,
            self::Rw => UserRole::Rw,
            self::Kadus => UserRole::Kadus,
            self::KasiPemerintahan => UserRole::KasiPemerintahan,
            self::KaurTuUmum => UserRole::KaurTuUmum,
            self::StafSid => UserRole::StafSid,
            self::SekretarisDesa => UserRole::SekretarisDesa,
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

    /**
     * Setiap jabatan berakun dipegang satu orang per wilayahnya, termasuk
     * Staf SIDUTama (staf_sid) yang hanya satu per desa; penggantinya lewat
     * rotasi.
     */
    public function isSingleHolderPerScope(): bool
    {
        return true;
    }

    /**
     * @return array<int, string>
     */
    public static function accountPositions(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Jabatan berakun dalam urutan pilihan "Tetapkan Pejabat" di dashboard.
     *
     * @return array<int, self>
     */
    public static function assignable(): array
    {
        return [
            self::KepalaDesa,
            self::SekretarisDesa,
            self::KasiPemerintahan,
            self::KaurTuUmum,
            self::Kadus,
            self::Rw,
            self::Rt,
            self::StafSid,
        ];
    }

    public function label(): string
    {
        return match ($this) {
            self::KepalaDesa => 'Kepala Desa',
            self::Rt => 'Ketua RT',
            self::Rw => 'Ketua RW',
            self::Kadus => 'Kepala Dusun',
            self::KasiPemerintahan => 'Kasi Pemerintahan',
            self::KaurTuUmum => 'Kaur TU & Umum',
            self::StafSid => UserRole::stafSidLabel(),
            self::SekretarisDesa => 'Sekretaris Desa',
        };
    }
}
