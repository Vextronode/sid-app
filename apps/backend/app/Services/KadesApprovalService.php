<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Repositories\LetterRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class KadesApprovalService
{
    private const AUTHORIZED_POSITIONS = ['kepala_desa', 'sekdes'];

    public function __construct(
        protected LetterRepository $letterRepository,
        protected OfficialService $officialService,
    ) {}

    /**
     * Daftar surat yang sedang menunggu keputusan Kades/Sekdes di
     * village milik user — dilihat oleh SIAPAPUN dari kedua posisi
     * (kepala_desa atau sekdes), sesuai aturan saling-menggantikan.
     */
    public function getPendingLetters(User $user): Collection
    {
        $official = $this->authorizeOfficial($user);

        return $this->letterRepository
            ->queryPendingAtFlowStepPositions(['kepala_desa'], $official->village_id)
            ->latest()
            ->get();
    }

    public function getLetterDetail(Letter $letter, User $user): Letter
    {
        $official = $this->authorizeOfficial($user);

        $letter = $this->letterRepository->loadDetailForApproval($letter);

        if ($letter->village_id !== $official->village_id) {
            abort(403, 'Anda tidak berwenang melihat surat ini.');
        }

        return $letter;
    }

    /**
     * Memutuskan (approve/reject) surat pada step 'kepala_desa'.
     * Boleh dipanggil oleh official kepala_desa ATAU sekdes di village
     * yang sama — siapapun yang lebih dulu, menang; percobaan kedua
     * (dari posisi manapun) akan ditolak karena step sudah tidak lagi
     * berada di 'kepala_desa' begitu keputusan pertama tercatat
     */
    public function decision(Letter $letter, User $user, array $data): void
    {
        $official = $this->authorizeOfficial($user);

        if ($letter->village_id !== $official->village_id) {
            abort(403, 'Anda tidak berwenang memproses surat ini.');
        }

        $step = $this->letterRepository->findCurrentFlowStep($letter);

        if (! $step || $step->approver_position !== 'kepala_desa') {
            abort(409, 'Surat ini tidak sedang berada di tahap Kepala Desa/Sekdes.');
        }

        DB::transaction(function () use ($letter, $user, $official, $data, $step) {

            // Guard "siapa cepat dia dapat": lock row surat di dalam
            // transaksi, lalu re-cek step saat ini SETELAH lock
            // didapat. Ini menutup race condition di mana Kades dan
            // Sekdes menekan approve/reject nyaris bersamaan — hanya
            // request yang benar-benar mendapat lock lebih dulu yang
            // akan melihat current_step_order masih di step ini;
            // request kedua akan melihat step sudah maju (atau surat
            // sudah reject) dan gagal di guard ini.
            $locked = $this->letterRepository->findForUpdateOrFail($letter->id);

            $currentStep = $this->letterRepository->findCurrentFlowStep($locked);

            if (! $currentStep || $currentStep->id !== $step->id) {
                abort(409, 'Surat ini sudah diproses oleh Kepala Desa/Sekdes lain sebelum Anda.');
            }

            $approvalLevel = $official->position === 'sekdes' ? 'sekdes' : 'kepala_desa';

            $this->letterRepository->createApprovalForLetter($locked, [
                'approved_by' => $user->id,
                'approval_level' => $approvalLevel,
                'flow_step_id' => $step->id,
                'action' => $data['status'],
                'notes' => $data['notes'] ?? null,
            ]);

            $oldStatus = $locked->status->value;

            if ($data['status'] === 'approved') {
                // Jika step ini is_final (flow 1-step langsung ke Kades),
                // status langsung 'approved'. Jika tidak (ada step lanjutan
                // misal Kasi), status menjadi 'in_progress'.
                $newStatus = $step->is_final ? 'approved' : 'in_progress';

                $this->letterRepository->update($locked, [
                    'status' => $newStatus,
                    'current_step_order' => $step->step_order + 1,
                    'processed_at' => now(),
                ]);
            } else {
                $newStatus = 'rejected';

                $this->letterRepository->update($locked, [
                    'status' => $newStatus,
                    'rejected_at_step' => $step->step_order,
                    'processed_at' => now(),
                ]);
            }

            // Catat audit trail — konsisten dengan RtApprovalService.
            $this->letterRepository->createStatusLogForLetter($locked, [
                'actor_id' => $user->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'reason' => $data['notes'] ?? null,
            ]);

            $this->notifyApplicant($locked, $data['status'], $approvalLevel);
        });
    }

    private function authorizeOfficial(User $user): Official
    {
        $official = $this->officialService->getCurrentOfficial($user);

        if (! in_array($official->position, self::AUTHORIZED_POSITIONS, true)) {
            abort(403, 'Anda tidak berwenang mengakses approval Kepala Desa.');
        }

        if (! $official->village_id) {
            abort(403, 'Data wilayah desa tidak ditemukan.');
        }

        return $official;
    }

    private function notifyApplicant(Letter $letter, string $status, string $approvalLevel): void
    {
        $citizenUser = $this->officialService->resolveCitizenUser($letter);

        if (! $citizenUser) {
            return;
        }

        $actorLabel = $approvalLevel === 'sekdes' ? 'Sekretaris Desa' : 'Kepala Desa';

        if ($status === 'approved') {
            $citizenUser->notify(new LetterStatusNotification(
                $letter,
                'Permohonan Diproses',
                "Permohonan surat Anda telah disetujui oleh {$actorLabel} dan sedang diproses ke tahap berikutnya.",
                'kepala_desa_approved',
            ));

            return;
        }

        $citizenUser->notify(new LetterStatusNotification(
            $letter,
            'Permohonan Ditolak',
            "Permohonan surat Anda ditolak oleh {$actorLabel}.",
            'kepala_desa_rejected',
        ));
    }
}
