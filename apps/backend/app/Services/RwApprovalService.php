<?php

namespace App\Services;

use App\Enums\LetterStatus;
use app\Models\Letter;
use app\Models\User;
use App\Notifications\LetterStatusNotification;
use Illuminate\Support\Facades\DB;

class RwApprovalService
{
    public function __construct(
        protected OfficialService $officialService
    ) {}

    // ==========================================
    // VALIDATE GATE
    // ==========================================

    private function validateGate(
        Letter $letter,
        User $user
    ): void {

        // Surat harus sudah disetujui RT
        if ($letter->status !== LetterStatus::RtApproved) {
            abort(
                403,
                'Surat belum dapat diproses oleh RW.'
            );
        }

        // Cek official RW
        $official = $user->official;

        if (! $official) {
            abort(
                403,
                'Data petugas tidak ditemukan.'
            );
        }

        // Pastikan RW sesuai dengan RT pemohon
        if (
            $letter->citizen->rt->rw_id
            != $official->rw_id
        ) {
            abort(
                403,
                'Anda tidak berwenang memproses surat ini.'
            );
        }
    }

    // ==========================================
    // DETAIL SURAT RW
    // ==========================================

    public function getLetterDetail(
        Letter $letter,
        User $user
    ) {

        return $letter->load([
            'citizen',
            'letterType',
            'approvals.approver',
        ]);
    }

    // ==========================================
    // APPROVE / REJECT RW
    // ==========================================

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

            // ======================================
            // STATUS LAMA
            // ======================================

            $oldStatus =
                $letter->status->value;

            // ======================================
            // STATUS BARU
            // ======================================

            $newStatus =
                $data['status'] === 'approved'
                    ? LetterStatus::RwApproved->value
                    : LetterStatus::RwRejected->value;

            // ======================================
            // NOTES
            // ======================================
            //
            // APPROVE:
            //   Pertahankan notes sebelumnya.
            //
            // REJECT:
            //   Ganti dengan alasan RW.
            // ======================================

            $notes = $letter->notes;

            if ($data['status'] === 'rejected') {

                $notes =
                    isset($data['notes'])
                        && trim($data['notes']) !== ''
                    ? trim($data['notes'])
                    : null;
            }

            // ======================================
            // UPDATE APPROVAL RW
            // ======================================

            $approval = $letter->approvals()
                ->where('approval_level', 'rw')
                ->whereNull('approved_by')
                ->latest()
                ->first();

            if ($approval) {

                $approval->update([
                    'approved_by' => $user->id,
                    'status' => $data['status'],
                ]);
            }

            // ======================================
            // UPDATE LETTER
            // ======================================

            $letter->update([
                'status' => $newStatus,
                'notes' => $notes,
                'processed_at' => now(),
            ]);

            // ======================================
            // STATUS LOG
            // ======================================

            $letter->statusLogs()->create([
                'actor_id' => $user->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,

                'reason' => $data['status'] === 'rejected'
                        ? $notes
                        : $letter->notes,
            ]);

            // ======================================
            // USER WARGA
            // ======================================

            $citizenUser =
                $this->officialService
                    ->resolveCitizenUser($letter);

            // ======================================
            // JIKA RW APPROVE
            // ======================================

            if ($data['status'] === 'approved') {

                // ----------------------------------
                // Cari operator desa berikutnya
                // ----------------------------------

                $nextOfficials =
                    $this->officialService
                        ->resolveNextOfficials(
                            $user->official
                        );

                // ----------------------------------
                // Notifikasi operator desa
                // ----------------------------------

                foreach ($nextOfficials as $official) {

                    if ($official->user) {

                        $official->user->notify(
                            new LetterStatusNotification(
                                $letter,
                                'Surat Baru',
                                'Ada surat yang menunggu verifikasi Operator Desa.',
                                'rw_approved'
                            )
                        );
                    }
                }

                // ----------------------------------
                // Notifikasi warga
                // ----------------------------------

                if ($citizenUser) {

                    $citizenUser->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Permohonan Disetujui',
                            'Permohonan surat Anda telah selesai diproses oleh RW.',
                            'rw_approved'
                        )
                    );
                }

            }

            // ======================================
            // JIKA RW REJECT
            // ======================================

            else {

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

    // ==========================================
    // DAFTAR SURAT RW
    // ==========================================

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

            ->whereHas(
                'citizen.rt',
                function ($query) use ($official) {

                    $query->where(
                        'rw_id',
                        $official->rw_id
                    );
                }
            )

            ->with([

                'citizen',

                'letterType',

                'approvals.approvedBy:id,name',

            ])

            ->latest()

            ->get();
    }
}
