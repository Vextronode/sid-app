<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;
use Illuminate\Support\Facades\DB;

class RtApprovalService
{
    public function __construct(
        protected OfficialService $officialService,
        protected LetterRepository $letterRepository,
        protected OfficialRepository $officialRepository,
    ) {}

    public function getPendingLetters(User $user)
    {
        $official = $user->official;

        if (! $official) {
            abort(403, 'Data official tidak ditemukan.');
        }

        return $this->letterRepository->queryByStatusesAndCitizenRt(
            ['pending', 'rt_approved', 'rw_approved', 'rt_rejected'],
            $official->rt_id
        )
            ->latest()
            ->get();
    }

    public function getLetterDetail(Letter $letter): Letter
    {
        return $this->letterRepository->loadDetailForApproval($letter);
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

        if (! isset($data['status'])) {
            abort(422, 'Status keputusan wajib diisi.');
        }

        if (! in_array($data['status'], [
            'approved',
            'rejected',
        ])) {
            abort(422, 'Status keputusan tidak valid.');
        }

        // ==========================================
        // NOTES
        // ==========================================

        if (
            $data['status'] === 'rejected' &&
            (! isset($data['notes']) || trim($data['notes']) === '')
        ) {
            abort(422, 'Alasan penolakan wajib diisi.');
        }

        // Kalau approve:
        // gunakan notes warga.
        //
        // Kalau reject:
        // gunakan notes yang ditulis RT.
        $decisionNotes = $data['status'] === 'rejected'
            ? trim($data['notes'])
            : $letter->notes;

        DB::transaction(function () use (
            $letter,
            $user,
            $data,
            $official,
            $decisionNotes
        ) {

            $oldStatus = $letter->status->value;

            $newStatus = $data['status'] === 'approved'
                ? 'rt_approved'
                : 'rt_rejected';

            // ==========================================
            // UPDATE LETTER
            // ==========================================

            $this->letterRepository->update($letter, [
                'status' => $newStatus,
                'processed_at' => now(),

                // APPROVED:
                // notes warga tetap
                //
                // REJECTED:
                // notes diganti alasan RT
                'notes' => $decisionNotes,
            ]);

            // ==========================================
            // APPROVAL RT
            // ==========================================

            $this->letterRepository->updateApprovalsByLevel($letter, 'rt', [
                'approved_by' => $user->id,
            ]);

            // ==========================================
            // APPROVED
            // ==========================================

            if ($data['status'] === 'approved') {

                $this->letterRepository->createApprovalForLetter($letter, [
                    'approved_by' => null,
                    'approval_level' => 'rw',
                    'deadline_at' => now()->addDays(2),
                ]);

                $rwOfficial = $this->officialRepository->findActiveRwByRwId($official->rw_id);

                if ($rwOfficial?->user) {

                    $rwOfficial->user->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Surat Baru',
                            'Ada surat yang menunggu persetujuan RW.',
                            'rt_approved'
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
                            'Permohonan surat Anda telah disetujui oleh RT dan sedang diproses oleh RW.',
                            'rt_approved'
                        )
                    );
                }

            } else {

                // ==========================================
                // REJECTED
                // ==========================================

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

            // ==========================================
            // STATUS LOG
            // ==========================================

            $this->letterRepository->createStatusLogForLetter($letter, [
                'actor_id' => $user->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'reason' => $decisionNotes,
            ]);
        });
    }
}
