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
    case WaitingRevisionWarga = 'waiting_revision_warga';
    case RejectedRevision = 'rejected_revision';
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
            self::WaitingRevisionWarga => 'Menunggu Revisi Warga',
            self::RejectedRevision => 'Ditolak Revisi',
            self::KadusApproved => 'Disetujui Kadus',
            self::KadusRejected => 'Ditolak Kadus',
            self::KasiApproved => 'Disetujui Kasi Pelayanan',
            self::KasiRejected => 'Ditolak Kasi Pelayanan',
        };
    }

    public function isRejected(): bool
    {
        return in_array($this, [
            self::RtRejected,
            self::RwRejected,
            self::RejectedRevision,
            self::KadusRejected,
            self::KasiRejected,
        ], true);
    }

    public function isApproved(): bool
    {
        return in_array($this, [
            self::RtApproved,
            self::RwApproved,
            self::KadusApproved,
            self::KasiApproved,
        ], true);
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
