<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Models\Letter;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use Illuminate\Support\Facades\DB;

class KasiApprovalService
{
    public function __construct(
        protected OfficialService $officialService
    ) {}

    public function getPendingLetters(User $user)
    {
        return Letter::query()
            ->where('status', LetterStatus::KadusApproved)
            ->whereHas('letterType', function ($query) use ($user) {
                $query->where('assigned_role', $user->role);
            })
            ->with([
                'citizen',
                'letterType',
            ])
            ->latest()
            ->get();
    }

    private function validateGate(
        Letter $letter,
        User $user
    ): void {

        if ($letter->status !== LetterStatus::KadusApproved) {
            abort(403, 'Surat belum dapat diproses.');
        }

        if (
            $user->role !==
            $letter->letterType->assigned_role
        ) {
            abort(403, 'Anda tidak berwenang memproses surat ini.');
        }
    }

    public function approve(
        Letter $letter,
        User $user,
        array $data
    ): void {

        $this->validateGate(
            $letter,
            $user
        );

        DB::transaction(function () use (
            $letter,
            $user,
            $data
        ) {

            $oldStatus = $letter->status->value;

            $newStatus = $data['status'] === 'approved'
                ? LetterStatus::KasiApproved->value
                : LetterStatus::KasiRejected->value;

            $letterNumber = null;
            $expiresAt = null;

            if ($data['status'] === 'approved') {

                $letter->approvals()
                    ->where('approval_level', 'kadus')
                    ->update([
                        'approved_by' => $user->id,
                    ]);

                $letterNumber = sprintf(
                    '%03d/%s/%d',
                    $letter->id,
                    strtoupper($letter->letterType->code),
                    now()->year
                );

                if ($letter->letterType->validity_days) {
                    $expiresAt = now()->addDays(
                        $letter->letterType->validity_days
                    );
                }
            }

            $letter->update([
                'status' => $newStatus,
                'letter_number' => $letterNumber,
                'expires_at' => $expiresAt,
                'notes' => $data['notes'] ?? null,
                'processed_at' => now(),
            ]);

            $letter->statusLogs()->create([
                'actor_id' => $user->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'reason' => $data['notes'] ?? null,
            ]);

            $citizenUser = $this->officialService
                ->resolveCitizenUser($letter);

            if ($data['status'] === 'approved') {

                if ($citizenUser) {
                    $citizenUser->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Permohonan Disetujui',
                            'Permohonan surat Anda telah selesai diproses.',
                            'kasi_approved'
                        )
                    );
                }

                $villageHead = $this->officialService
                    ->resolveVillageHead();

                if ($villageHead?->user) {
                    $villageHead->user->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Monitoring Surat',
                            'Surat telah selesai diproses oleh Kasi/Kaur.',
                            'kasi_approved'
                        )
                    );
                }

            } else {

                if ($citizenUser) {
                    $citizenUser->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Permohonan Ditolak',
                            'Permohonan surat Anda ditolak oleh Kasi/Kaur.',
                            'kasi_rejected'
                        )
                    );
                }
            }

        });
    }
}