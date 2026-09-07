<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Models\Letter;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Repositories\LetterRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class KasiApprovalService
{
    public function __construct(
        protected OfficialService $officialService,
        protected LetterRepository $letterRepository,
    ) {}

    /**
     * Catatan refactor: method ini dipertahankan apa adanya (termasuk
     * scope assigned_role='rw') sesuai kode asli, meskipun saat ini
     * tidak dipanggil oleh KasiApprovalController manapun -
     * index() controller memanggil getDashboardLetters(), bukan ini.
     */
    public function getPendingLetters(User $user): Collection
    {
        return $this->letterRepository->queryByStatusesAndLetterTypeAssignedRole(
            [
                LetterStatus::RwApproved,
                LetterStatus::KasiApproved,
                LetterStatus::KasiRejected,
            ],
            'rw'
        )
            ->latest()
            ->get();
    }

    public function getDashboardLetters(User $user)
    {
        return $this->letterRepository->allWithDetailForApproval();
    }

    public function getLetterDetail(Letter $letter): Letter
    {
        return $this->letterRepository->loadDetailForApproval($letter);
    }

    private function validateGate(
        Letter $letter,
        User $user
    ): void {

        if ($letter->status !== LetterStatus::RwApproved) {
            abort(403, 'Surat belum mendapat persetujuan RW.');
        }

        if (
            ! in_array($user->role, [
                'petugas_desa',
                'kasi_pelayanan',
                'kaur_tu_umum',
            ])
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

                $this->letterRepository->updateApprovalsByLevel($letter, 'kasi', [
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

            $this->letterRepository->update($letter, [
                'status' => $newStatus,
                'letter_number' => $letterNumber,
                'expires_at' => $expiresAt,
                'processed_at' => now(),
            ]);

            $this->letterRepository->createStatusLogForLetter($letter, [
                'actor_id' => $user->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'reason' => $data['notes'] ?? null,
            ]);

            $citizenUser = $letter->citizen->user;

            if ($data['status'] === 'approved') {

                if ($citizenUser) {
                    $citizenUser->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Permohonan Disetujui',
                            'Permohonan surat Anda telah selesai diproses oleh operator. Silakan ambil ke kantor desa.',
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
