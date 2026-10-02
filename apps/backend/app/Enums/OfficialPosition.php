<?php

namespace App\Enums;

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
    case KasiKesejahteraan = 'kasi_kesejahteraan';
    case KasiPemerintahan = 'kasi_pemerintahan';
    case KaurPerencanaan = 'kaur_perencanaan';
    case KaurKeuangan = 'kaur_keuangan';
    case StafSipades = 'staf_sipades';
    case StafSiskeudes = 'staf_siskeudes';

    public function userRole(): ?UserRole
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
            default => null,
        };
    }

    public function hasAccount(): bool
    {
        return $this->userRole() !== null;
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
        return array_values(array_map(
            fn (self $position) => $position->value,
            array_filter(self::cases(), fn (self $position) => $position->hasAccount()),
        ));
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
            self::KasiKesejahteraan => 'Kasi Kesejahteraan',
            self::KasiPemerintahan => 'Kasi Pemerintahan',
            self::KaurPerencanaan => 'Kaur Perencanaan',
            self::KaurKeuangan => 'Kaur Keuangan',
            self::StafSipades => 'Staf SIPADES',
            self::StafSiskeudes => 'Staf SISKEUDES',
        };
    }
}
