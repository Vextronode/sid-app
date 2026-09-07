<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Repositories\LetterRepository;
use Illuminate\Support\Facades\DB;

class KadusApprovalService
{
    public function __construct(
        protected OfficialService $officialService,
        protected LetterRepository $letterRepository,
        protected OfficialRepository $officialRepository,
    ) {}

    public function getLetters(User $user)
    {
        $official = $user->official;

        if (! $official) {
            abort(403, 'Data official tidak ditemukan.');
        }

        return $this->letterRepository->queryByCitizenHamlet($official->hamlet_id)
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

            $this->letterRepository->update($letter, [
                'status' => $newStatus,
                'notes' => $data['notes'] ?? null,
                'processed_at' => now(),
            ]);

            $this->letterRepository->updateApprovalsByLevel($letter, 'kadus', [
                'approved_by' => $user->id,
            ], onlyPending: true);

            $this->letterRepository->createStatusLogForLetter($letter, [
                'actor_id' => $user->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'reason' => $data['notes'] ?? null,
            ]);

            if ($data['status'] === 'approved') {

                $nextOfficial = $this->officialRepository->findActiveByPositionAndVillage(
                    $letter->letterType->assigned_role,
                    $letter->village_id
                );

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
