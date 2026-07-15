<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RtApprovalService
{
    public function getPendingLetters(User $user)
    {
        $official = $user->official;

        return Letter::query()
            ->where('status', 'pending')
            ->whereHas('citizen', function ($query) use ($official) {
                $query->where('rt_id', $official->rt_id);
            })
            ->with([
                'citizen',
                'letterType',
            ])
            ->latest()
            ->get();
    }

    public function decision(
        Letter $letter,
        User $user,
        array $data
    ): void {

        $official = $user->official;

        if (! $official) {
            abort(403, 'Data petugas tidak ditemukan.');
        }

        if ($letter->citizen->rt_id != $official->rt_id) {
            abort(403, 'Anda tidak berwenang memproses surat ini.');
        }

        DB::transaction(function () use (
            $letter,
            $user,
            $data
        ) {

            $oldStatus = $letter->status->value;

            $newStatus = $data['status'] === 'approved'
                ? 'rt_approved'
                : 'rt_rejected';

            // update letter
            $letter->update([
                'status' => $newStatus,
                'notes' => $data['notes'] ?? null,
                'processed_at' => now(),
            ]);

            // insert letter_approvals
            $letter->approvals()->create([
                'approved_by' => $user->id,
                'approval_level' => 'rt',
                'deadline_at' => now()->addDays(2),
            ]);

            // insert letter_status_logs
            $letter->statusLogs()->create([
                'actor_id' => $user->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'reason' => $data['notes'] ?? null,
            ]);

            // reject -> kirim notifikasi
            if ($data['status'] === 'rejected') {

            }

        });
    }
}