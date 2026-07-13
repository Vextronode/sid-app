<?php

declare(strict_types=1);

namespace App\Enums;

enum LetterStatus: string
{
    case Pending = 'pending';
    case RtApproved = 'rt_approved';
    case RtRejected = 'rt_rejected';
    case RwApproved = 'rw_approved';
    case RwRejected = 'rw_rejected';
    case KadusApproved = 'kadus_approved';
    case KadusRejected = 'kadus_rejected';
    case KasiApproved = 'kasi_approved';
    case KasiRejected = 'kasi_rejected';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu',
            self::RtApproved => 'Disetujui RT',
            self::RtRejected => 'Ditolak RT',
            self::RwApproved => 'Disetujui RW',
            self::RwRejected => 'Ditolak RW',
            self::KadusApproved => 'Disetujui Kadus',
            self::KadusRejected => 'Ditolak Kadus',
            self::KasiApproved => 'Disetujui Kasi Pelayanan',
            self::KasiRejected => 'Ditolak Kasi Pelayanan',
        };
    }

    public function isRejected(): bool
    {
        return str_ends_with($this->value, '_rejected');
    }

    public function isApproved(): bool
    {
        return str_ends_with($this->value, '_approved');
    }

    public function isFinalApproval(): bool
    {
        return $this === self::KasiApproved;
    }

    public function isTerminal(): bool
    {
        return $this->isRejected() || $this === self::KasiApproved;
    }
}
