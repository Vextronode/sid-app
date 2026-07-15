<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use App\Notifications\LetterStatusNotification;

class RtApprovalService
{
    public function __construct(
        protected OfficialService $officialService
    ) {}

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

            // Update letter
            $letter->update([
                'status' => $newStatus,
                'notes' => $data['notes'] ?? null,
                'processed_at' => now(),
            ]);

            // Approval RT
            $letter->approvals()->create([
                'approved_by' => $user->id,
                'approval_level' => 'rt',
                'deadline_at' => now()->addDays(2),
            ]);

            $currentOfficial = $this->officialService
                ->getCurrentRt($user);

            if ($data['status'] === 'approved') {

                // Approval RW
                $letter->approvals()->create([
                    'approved_by' => null,
                    'approval_level' => 'rw',
                    'deadline_at' => now()->addDays(2),
                ]);

                // Cari RW
                $nextOfficial = $this->officialService
                    ->resolveNextOfficial($currentOfficial);

                // Notifikasi RW
                if ($nextOfficial?->user) {

                    $nextOfficial->user->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Surat Baru',
                            'Ada surat yang menunggu persetujuan RW.',
                            'rt_approved'
                        )
                    );
                }

                // Notifikasi Warga
                $citizenUser = $this->officialService
                    ->resolveCitizenUser($letter);

                if ($citizenUser) {

                    $citizenUser->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Permohonan Diproses',
                            'Permohonan surat Anda telah disetujui oleh RT dan sedang diproses oleh RW.',
                            'rt_approved'
                        )
                    );
                }

            } else {

                // Notifikasi Warga
                $citizenUser = $this->officialService
                    ->resolveCitizenUser($letter);

                if ($citizenUser) {

                    $citizenUser->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Permohonan Ditolak',
                            'Permohonan surat Anda ditolak oleh RT.',
                            'rt_rejected'
                        )
                    );
                }
            }

            // Status Log
            $letter->statusLogs()->create([
                'actor_id' => $user->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'reason' => $data['notes'] ?? null,
            ]);
        });
    }
}