<?php

namespace App\Repositories;

use App\Models\Letter;
use App\Models\LetterApproval;

class LetterApprovalRepository
{
    public function findLatestPendingByLevel(Letter $letter, string $level): ?LetterApproval
    {
        return $letter->approvals()
            ->where('approval_level', $level)
            ->whereNull('approved_by')
            ->latest()
            ->first();
    }

    public function updateApprovedBy(LetterApproval $approval, int $userId): LetterApproval
    {
        $approval->update([
            'approved_by' => $userId,
        ]);

        return $approval;
    }

    public function updateApprovedByAndStatus(LetterApproval $approval, int $userId, string $status): LetterApproval
    {
        $approval->update([
            'approved_by' => $userId,
            'action' => $status,
        ]);

        return $approval;
    }
}
