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

    /**
     * EV5-4-S6. Status generik target v5.0 (TDD-03 §"Semantik
     * letters.status") - dipakai KasiApprovalService mulai sekarang,
     * BUKAN lagi KasiApproved/KasiRejected. Case granular di atas
     * TETAP dipertahankan (bukan dihapus) karena PdfService::download()
     * masih menggate ke KasiApproved sampai EV5-4-S9 menyesuaikannya
     * ke status generik ini.
     */
    case Approved = 'approved';
    case Rejected = 'rejected';

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
            self::Approved => 'Disetujui',
            self::Rejected => 'Ditolak',
        };
    }

    public function isRejected(): bool
    {
        return in_array($this, [
            self::RtRejected,
            self::RwRejected,
            self::KadusRejected,
            self::KasiRejected,
            self::Rejected,
        ], true);
    }

    public function isApproved(): bool
    {
        return in_array($this, [
            self::RtApproved,
            self::RwApproved,
            self::KadusApproved,
            self::KasiApproved,
            self::Approved,
        ], true);
    }

    public function isFinalApproval(): bool
    {
        return in_array($this, [self::KasiApproved, self::Approved], true);
    }

    public function isTerminal(): bool
    {
        return $this->isRejected() || $this->isFinalApproval();
    }
}
