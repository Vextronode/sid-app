<?php

declare(strict_types=1);

namespace App\Enums;

enum LetterStatus: string
{
    // - Status generik v5
    case Pending = 'pending';
    case InProgress = 'in_progress';
    case Approved = 'approved';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu',
            self::InProgress => 'Sedang Diproses',
            self::Approved => 'Disetujui',
            self::Rejected => 'Ditolak',
        };
    }

    public function isRejected(): bool
    {
        return $this === self::Rejected;
    }

    public function isApproved(): bool
    {
        return $this === self::Approved;
    }

    public function isFinalApproval(): bool
    {
        return $this === self::Approved;
    }

    public function isInProgress(): bool
    {
        return $this === self::InProgress;
    }

    public function isTerminal(): bool
    {
        return $this->isRejected() || $this->isFinalApproval();
    }
}
