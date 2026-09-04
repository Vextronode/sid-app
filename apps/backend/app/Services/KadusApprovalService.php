<?php

namespace App\Services;

use app\Models\Letter;
use app\Models\Official;
use app\Models\User;
use App\Notifications\LetterStatusNotification;
use Illuminate\Support\Facades\DB;

class KadusApprovalService
{
    public function __construct(
        protected OfficialService $officialService
    ) {}

    public function getLetters(User $user)
    {
        $official = $user->official;

        if (! $official) {
            abort(403, 'Data official tidak ditemukan.');
        }

        return Letter::query()

            ->whereHas('citizen', function ($query) use ($official) {

                $query->where(
                    'hamlet_id',
                    $official->hamlet_id
                );

            })

            ->with([
                'citizen',
                'letterType',
                'approvals.approvedBy:id,name',
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

            $letter->approvals()
                ->where('approval_level', 'kadus')
                ->whereNull('approved_by')
                ->update([
                    'approved_by' => $user->id,
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
                                .strtoupper($letter->letterType->assigned_role).'.',
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
                                .strtoupper($letter->letterType->assigned_role).'.',
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
