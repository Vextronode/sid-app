<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Status surat selama transisi approval v5.
 *
 * Nilai generik dipakai oleh schema v5 dan service approval yang telah
 * dimigrasikan. Nilai granular dipertahankan sementara karena service
 * Kasi dan PDF belum dimigrasikan (EV5-4-S6 dan EV5-4-S9).
 */
enum LetterStatus: string
{
    // Status generik v5 (sesuai enum kolom letters dan letter_status_logs).
    case Pending = 'pending';
    case InProgress = 'in_progress';
    case Approved = 'approved';
    case Rejected = 'rejected';

    // Status granular v4: compatibility sementara untuk service yang belum direwrite.
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
            self::InProgress => 'Sedang Diproses',
            self::Approved => 'Disetujui',
            self::Rejected => 'Ditolak',
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
        return in_array($this, [
            self::Rejected,
            self::RtRejected,
            self::RwRejected,
            self::KadusRejected,
            self::KasiRejected,
        ], true);
    }

    public function isApproved(): bool
    {
        return in_array($this, [
            self::Approved,
            self::RtApproved,
            self::RwApproved,
            self::KadusApproved,
            self::KasiApproved,
        ], true);
    }

    public function isFinalApproval(): bool
    {
        return $this === self::Approved || $this === self::KasiApproved;
    }

    public function isTerminal(): bool
    {
        return $this->isRejected() || $this->isFinalApproval();
    }
}
