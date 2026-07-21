<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Models\Letter;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use Illuminate\Support\Facades\DB;

class RwApprovalService
{
    public function __construct(
        protected OfficialService $officialService
    ) {}

    private function validateGate(
        Letter $letter,
        User $user
    ): void {

        if ($letter->status !== LetterStatus::RtApproved) {
            abort(403, 'Surat belum dapat diproses oleh RW.');
        }

        $official = $user->official;

        if (! $official) {
            abort(403, 'Data petugas tidak ditemukan.');
        }

        if ($letter->citizen->rt->rw_id != $official->rw_id) {
            abort(403, 'Anda tidak berwenang memproses surat ini.');
        }
    }

    /**
     * ============================================================
     * Detail surat RW
     * ============================================================
     */
    public function getLetterDetail(
        Letter $letter,
        User $user
    )
    {
        return $letter->load([
            'citizen',
            'letterType',
            'approvals.approver',
        ]);
    }
    
    public function approve(
        Letter $letter,
        User $user,
        array $data
    ): void {

        $this->validateGate($letter, $user);

        DB::transaction(function () use (
            $letter,
            $user,
            $data
        ) {

            $oldStatus = $letter->status->value;

            $newStatus = $data['status'] === 'approved'
                ? LetterStatus::RwApproved->value
                : LetterStatus::RwRejected->value;

            

            $letter->approvals()
                ->where('approval_level', 'rw')
                ->whereNull('approved_by')
                ->latest()
                ->first()
                ?->update([
                    'approved_by' => $user->id,
                    'status' => $data['status'],
                ]);

            

            $letter->update([
                'status' => $newStatus,
                'notes' => $data['notes'] ?? null,
                'processed_at' => now(),
            ]);

            

            $letter->statusLogs()->create([
                'actor_id' => $user->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'reason' => $data['notes'] ?? null,
            ]);

            

            if ($data['status'] === 'approved') {

               
                $letter->approvals()->create([
                    'approved_by' => null,
                    'approval_level' => 'kadus',
                    'deadline_at' => now()->addDays(2),
                ]);

                $currentOfficial = $this->officialService
                    ->getCurrentRw($user);

                $nextOfficial = $this->officialService
                    ->resolveNextOfficial($currentOfficial);

                if ($nextOfficial?->user) {

                    $nextOfficial->user->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Surat Baru',
                            'Ada surat yang menunggu persetujuan Kadus.',
                            'rw_approved'
                        )
                    );
                }

                $citizenUser = $this->officialService
                    ->resolveCitizenUser($letter);

                if ($citizenUser) {

                    $citizenUser->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Permohonan Diproses',
                            'Permohonan surat Anda telah disetujui oleh RW dan sedang diproses oleh Kadus.',
                            'rw_approved'
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
                            'Permohonan surat Anda ditolak oleh RW.',
                            'rw_rejected'
                        )
                    );
                }
            }
        });
    }

    public function getPendingLetters(User $user)
    {
        $official = $user->official()
            ->where('position', 'rw')
            ->where('is_active', true)
            ->firstOrFail();


        return Letter::query()

            ->whereIn('status', [

                LetterStatus::RtApproved,

                LetterStatus::RwApproved,

                LetterStatus::RwRejected,

            ])

            ->whereHas('citizen.rt', function ($query) use ($official) {

                $query->where('rw_id', $official->rw_id);

            })


            ->with([

                'citizen',

                'letterType',

                'approvals.approvedBy:id,name'

            ])


            ->latest()

            ->get();
    }


}