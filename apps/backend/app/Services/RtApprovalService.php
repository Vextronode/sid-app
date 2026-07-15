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
            ->where('rt_id', $official->rt_id)
            ->where('status', 'pending')
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

        if ($official->rt_id != $letter->rt_id) {
            abort(403, 'Anda tidak berwenang.');
        }

        DB::transaction(function () use (
            $letter,
            $official,
            $data
        ) {

            if ($data['status'] == 'approved') {

                $letter->update([
                    'status' => 'rt_approved',
                ]);

            } else {

                $letter->update([
                    'status' => 'rt_rejected',
                ]);

            }

            $letter->approvals()->create([
                'level' => 'rt',
                'official_id' => $official->id,
                'status' => $data['status'],
                'notes' => $data['notes'] ?? null,
                'deadline_at' => now()->addDays(2),
            ]);

            $letter->statusLogs()->create([
                'status' => $letter->status,
                'notes' => $data['notes'] ?? null,
                'changed_by' => $user->id,
            ]);

            if ($data['status'] == 'rejected') {

                // dispatch notification ke warga
            }

        });
    }
}