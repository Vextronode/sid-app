<?php

namespace App\Enums;

/**
 * Status pendaftaran data usaha warga sebagai pedagang Cimart
 * (citizen_businesses.cimart_status). NULL berarti warga tidak mendaftar.
 * `cancelled` hanya ada di SID: Cimart tidak pernah menerimanya sebagai data.
 */
enum CimartApplicationStatus: string
{
    case Pending = 'pending';
    case Accepted = 'accepted';
    case Rejected = 'rejected';
    case Cancelled = 'cancelled';

    /** Teks status untuk warga di halaman Usaha Saya. */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu diproses Cimart',
            self::Accepted => 'Akun pedagang sudah dibuat',
            self::Rejected => 'Ditolak',
            self::Cancelled => 'Pendaftaran dibatalkan',
        };
    }
}
