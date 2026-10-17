<?php

namespace App\Repositories;

use App\Enums\LetterStatus;
use App\Models\Letter;
use App\Models\LetterApproval;
use Illuminate\Support\LazyCollection;

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

    /**
     * Approval tahap aktif yang belum diputuskan dan belum pernah
     * diingatkan. Jendela waktu (reminder_hours per level & desa)
     * disaring di ApprovalReminderService agar tidak bergantung pada
     * aritmetika interval khas driver database.
     *
     * @return LazyCollection<int, LetterApproval>
     */
    public function lazyPendingForReminder(): LazyCollection
    {
        return LetterApproval::query()
            ->select('letter_approvals.*')
            ->join('letters', 'letters.id', '=', 'letter_approvals.letter_id')
            ->join('flow_steps', 'flow_steps.id', '=', 'letter_approvals.flow_step_id')
            ->whereNull('letter_approvals.approved_by')
            ->whereNull('letter_approvals.action')
            ->whereNull('letter_approvals.reminded_at')
            ->whereNotNull('letter_approvals.deadline_at')
            ->whereIn('letters.status', [LetterStatus::Pending->value, LetterStatus::InProgress->value])
            ->whereColumn('flow_steps.step_order', 'letters.current_step_order')
            ->with(['letter', 'flowStep'])
            ->lazyById(100, 'letter_approvals.id', 'id');
    }

    /**
     * Klaim atomik: hanya satu proses yang berhasil mengisi reminded_at,
     * sehingga run scheduler yang bertabrakan tidak mengirim dua kali.
     */
    public function markReminded(LetterApproval $approval): bool
    {
        return LetterApproval::query()
            ->whereKey($approval->id)
            ->whereNull('reminded_at')
            ->update(['reminded_at' => now()]) === 1;
    }

    public function updateApprovedBy(LetterApproval $approval, string $userId): LetterApproval
    {
        $approval->update([
            'approved_by' => $userId,
        ]);

        return $approval;
    }

    public function updateApprovedByAndStatus(LetterApproval $approval, string $userId, string $status): LetterApproval
    {
        $approval->update([
            'approved_by' => $userId,
            'action' => $status,
        ]);

        return $approval;
    }
}
