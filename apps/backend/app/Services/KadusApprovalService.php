<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use Illuminate\Support\Facades\DB;

class KadusApprovalService
{
    public function __construct(
        protected OfficialService $officialService
    ) {}

    public function getPendingLetters(User $user)
    {
        $official = $user->official;

        return Letter::query()
            ->where('status', 'rw_approved')
            ->whereHas('citizen', function ($query) use ($official) {

                $query->where(
                    'hamlet_id',
                    $official->hamlet_id
                );

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

        if (
            $letter->citizen->hamlet_id !=
            $official->hamlet_id
        ) {
            abort(403, 'Anda tidak berwenang memproses surat ini.');
        }

        DB::transaction(function () use (
            $letter,
            $user,
            $data
        ) {

            $oldStatus = $letter->status->value;

            $newStatus = $data['status'] === 'approved'
                ? 'kadus_approved'
                : 'kadus_rejected';

            $letter->update([
                'status' => $newStatus,
                'notes' => $data['notes'] ?? null,
                'processed_at' => now(),
            ]);

            $letter->approvals()->create([
                'approved_by' => $user->id,
                'approval_level' => 'kadus',
                'deadline_at' => now()->addDays(2),
            ]);

            $letter->statusLogs()->create([
                'actor_id' => $user->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'reason' => $data['notes'] ?? null,
            ]);

            if ($data['status'] === 'approved') {

                $nextOfficial = Official::query()
                    ->where(
                        'position',
                        $letter->letterType->assigned_role
                    )
                    ->where(
                        'village_id',
                        $letter->village_id
                    )
                    ->where(
                        'is_active',
                        true
                    )
                    ->first();

                // Notifikasi Kasi/Kaur
                if ($nextOfficial?->user) {

                    $nextOfficial->user->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Surat Baru',
                            'Ada surat yang menunggu persetujuan '
                                . strtoupper($letter->letterType->assigned_role) . '.',
                            'kadus_approved'
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
                            'Permohonan surat Anda telah disetujui oleh Kepala Dusun dan sedang diproses oleh '
                                . strtoupper($letter->letterType->assigned_role) . '.',
                            'kadus_approved'
                        )
                    );
                }

            } else {

                $citizenUser = $this->officialService
                    ->resolveCitizenUser($letter);

                if ($citizenUser) {

                    $citizenUser->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Permohonan Ditolak',
                            'Permohonan surat Anda ditolak oleh Kepala Dusun.',
                            'kadus_rejected'
                        )
                    );
                }

            }

        });

    }
}