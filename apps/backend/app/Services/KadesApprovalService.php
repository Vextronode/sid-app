<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Repositories\LetterRepository;
use Illuminate\Support\Facades\DB;

class KadesApprovalService
{
    private const AUTHORIZED_POSITIONS = ['kepala_desa', 'sekdes'];

    public function __construct(
        protected LetterRepository $letterRepository,
        protected OfficialService $officialService,
        protected LetterFlowService $letterFlowService,
        protected LetterNumberGenerator $letterNumberGenerator,
        protected ApprovalSettingService $approvalSettingService,
    ) {}

    /**
     * Memutuskan (approve/reject) surat pada tahap Kepala Desa.
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

        if ($this->letterFlowService->isApplicantOfficial($letter, $official)) {
            abort(403, 'Anda tidak dapat memutuskan surat milik Anda sendiri.');
        }

        $step = $this->letterRepository->findCurrentFlowStep($letter);

        if (! $step || $step->approver_position !== 'kepala_desa') {
            abort(409, 'Surat ini tidak sedang berada di tahap Kepala Desa.');
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

            if (! in_array($locked->status->value, [
                LetterStatus::Pending->value,
                LetterStatus::InProgress->value,
            ], true)) {
                abort(409, 'Surat sudah diproses sebelumnya.');
            }

            $currentStep = $this->letterRepository->findCurrentFlowStep($locked);

            if (! $currentStep || $currentStep->id !== $step->id) {
                abort(409, 'Surat ini sudah diproses oleh Kepala Desa/Sekdes lain sebelum Anda.');
            }

            $approvalLevel = $official->position === 'sekdes' ? 'sekdes' : 'kepala_desa';

            $this->letterRepository->recordDecisionForLetter($locked, [
                'approved_by' => $user->id,
                'approval_level' => $approvalLevel,
                'flow_step_id' => $step->id,
                'action' => $data['status'],
                'notes' => $data['notes'] ?? null,
            ]);

            $oldStatus = $locked->status->value;

            if ($data['status'] === 'approved') {
                if ($step->is_final) {
                    $this->finalizeApproval($locked);
                    $newStatus = LetterStatus::Approved->value;
                } else {
                    $next = $this->letterFlowService->nextActionable($locked, $step->step_order);
                    $newStatus = LetterStatus::InProgress->value;

                    $this->letterRepository->update($locked, [
                        'status' => $newStatus,
                        'current_step_order' => $next['step']->step_order,
                        'processed_at' => now(),
                    ]);
                    $this->letterFlowService->logSkipped($locked, $next['skipped'], $user);
                    $this->createPendingApproval($locked, $next['step']);
                    $this->notifyNextApprovers($locked, $next['step']);
                }
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

            if ($data['status'] === 'rejected') {
                $this->notifyApplicantRejected($locked, $approvalLevel);
            } elseif ($step->is_final) {
                $this->notifyFinalApproval($locked);
            }
        });
    }

    private function createPendingApproval(Letter $letter, FlowStep $step): void
    {
        $this->letterRepository->createApprovalForLetter($letter, [
            'approved_by' => null,
            'approval_level' => $step->approver_position,
            'flow_step_id' => $step->id,
            'deadline_at' => $this->approvalSettingService->resolveDeadline(
                $step->approver_position,
                $letter->village_id,
            ),
        ]);
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

    private function finalizeApproval(Letter $letter): void
    {
        $letterType = $letter->letterType;
        $expiresAt = $letterType->validity_days
            ? now()->addDays($letterType->validity_days)
            : null;

        $this->letterRepository->update($letter, [
            'status' => LetterStatus::Approved,
            'letter_number' => $this->letterNumberGenerator->next($letter),
            'expires_at' => $expiresAt,
            'processed_at' => now(),
        ]);
    }

    private function notifyApplicantRejected(Letter $letter, string $approvalLevel): void
    {
        $citizenUser = $this->officialService->resolveCitizenUser($letter);

        if (! $citizenUser) {
            return;
        }

        $actorLabel = $approvalLevel === 'sekdes' ? 'Sekretaris Desa' : 'Kepala Desa';

        $citizenUser->notify(new LetterStatusNotification(
            $letter,
            'Permohonan Ditolak',
            "Permohonan surat Anda ditolak oleh {$actorLabel}.",
            'kepala_desa_rejected',
        ));
    }

    private function notifyFinalApproval(Letter $letter): void
    {
        $citizenUser = $this->officialService->resolveCitizenUser($letter);
        $citizenUser?->notify(new LetterStatusNotification(
            $letter,
            'Permohonan Disetujui',
            'Permohonan surat Anda telah disetujui. Silakan unduh surat atau ambil di kantor desa.',
            'letter_approved_final',
        ));

        foreach ($this->officialService->resolveKasiKaurForLetter($letter) as $official) {
            $official->user?->notify(new LetterStatusNotification(
                $letter,
                'Surat siap diunduh/dicetak untuk warga',
                'Surat telah disetujui dan siap diunduh atau dicetak untuk warga.',
                'letter_ready_for_print',
            ));
        }
    }

    private function notifyNextApprovers(Letter $letter, FlowStep $step): void
    {
        foreach ($this->letterFlowService->eligibleApprovers($step, $letter) as $official) {
            $official->user?->notify(new LetterStatusNotification(
                $letter,
                'Surat Baru',
                'Ada surat yang menunggu persetujuan Anda.',
                'kepala_desa_approved',
            ));
        }
    }
}
