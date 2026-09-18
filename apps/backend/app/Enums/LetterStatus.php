<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Status surat selama transisi approval v5.
 *
 * Nilai generik (Pending, InProgress, Approved, Rejected) adalah target
 * akhir v5.0 dan sudah dipakai oleh schema letters & letter_status_logs.
 * KasiApprovalService mulai menulis Approved/Rejected sejak EV5-4-S6.
 *
 * Nilai granular v4 (Rt*, Rw*, Kadus*, Kasi*) dipertahankan sementara
 * karena PdfService masih menggate ke KasiApproved sampai EV5-4-S9
 * menyesuaikannya ke status generik.
 */
enum LetterStatus: string
{
    // - Status generik v5
    case Pending = 'pending';
    case InProgress = 'in_progress';
    case Approved = 'approved';
    case Rejected = 'rejected';

    // - Status granular v4: compatibility sementara
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
        return in_array($this, [self::KasiApproved, self::Approved], true);
    }

    public function isTerminal(): bool
    {
        return $this->isRejected() || $this->isFinalApproval();
    }
}
