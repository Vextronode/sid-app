<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\Official;
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
        protected LetterFlowService $letterFlowService,
        protected ApprovalSettingService $approvalSettingService,
    ) {}

    /**
     * Memutuskan (approve/reject) surat pada step 'rt'. Hanya RT yang
     * rt_id-nya sesuai wilayah citizen pemohon yang berwenang (gate
     * berbasis wilayah, bukan posisi murni — beda dari Kades/Sekdes).
     */
    public function decision(Letter $letter, User $user, array $data): void
    {
        $official = $this->authorizeOfficial($user);

        if ($this->letterFlowService->isApplicantOfficial($letter, $official)) {
            abort(403, 'Anda tidak dapat memutuskan surat milik Anda sendiri.');
        }

        $letter = $this->letterRepository->loadDetailForApproval($letter);

        if ($letter->citizen?->rt_id !== $official->rt_id) {
            abort(403, 'Anda tidak berwenang memproses surat ini.');
        }

        $step = $this->letterRepository->findCurrentFlowStep($letter);

        if (! $step || $step->approver_position !== 'rt') {
            abort(409, 'Surat ini tidak sedang berada di tahap RT.');
        }

        DB::transaction(function () use ($letter, $user, $data, $step) {

            // Lock row, lalu re-cek step SETELAH lock didapat — menutup
            // race condition antara buka halaman & submit keputusan,
            // pola sama seperti KadesApprovalService::decision().
            $locked = $this->letterRepository->findForUpdateOrFail($letter->id);

            if (! in_array($locked->status->value, [
                LetterStatus::Pending->value,
                LetterStatus::InProgress->value,
            ], true)) {
                abort(409, 'Surat sudah diproses sebelumnya.');
            }

            $currentStep = $this->letterRepository->findCurrentFlowStep($locked);

            if (! $currentStep || $currentStep->id !== $step->id) {
                abort(409, 'Surat sudah diproses sebelumnya.');
            }

            $this->letterRepository->recordDecisionForLetter($locked, [
                'approved_by' => $user->id,
                'approval_level' => 'rt',
                'flow_step_id' => $step->id,
                'action' => $data['status'],
                'notes' => $data['notes'] ?? null,
            ]);

            $oldStatus = $locked->status->value;

            if ($data['status'] === 'approved') {
                $newStatus = 'in_progress';
                $next = $this->letterFlowService->nextActionable($locked, $step->step_order);

                $this->letterRepository->update($locked, [
                    'status' => $newStatus,
                    'current_step_order' => $next['step']->step_order,
                    'processed_at' => now(),
                ]);
                $this->letterFlowService->logSkipped($locked, $next['skipped'], $user);
                $this->createPendingApproval($locked, $next['step']);
            } else {
                $newStatus = 'rejected';

                $this->letterRepository->update($locked, [
                    'status' => $newStatus,
                    'rejected_at_step' => $step->step_order,
                    'processed_at' => now(),
                ]);
            }

            $this->letterRepository->createStatusLogForLetter($locked, [
                'actor_id' => $user->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'reason' => $data['notes'] ?? null,
            ]);

            if ($data['status'] === 'approved') {
                $this->notifyRwFyi($locked);
                $this->notifyKadusFyi($locked);
                $this->notifyNextApprovers($locked, $next['step']);
                $this->notifyApplicant($locked, 'approved');
            } else {
                $this->notifyApplicant($locked, 'rejected');
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
        $official = $this->officialService->getCurrentRt($user);

        if (! $official->rt_id) {
            abort(403, 'Data wilayah RT tidak ditemukan.');
        }

        if (! $official->village_id) {
            abort(403, 'Data wilayah desa tidak ditemukan.');
        }

        return $official;
    }

    /**
     * Side-effect NON-BLOCKING: kirim notifikasi FYI ke seluruh RW
     * aktif di wilayah (rw_id) tempat RT ini berada. RW tidak pernah
     * membuat row letter_approvals dan tidak pernah menjadi gate —
     * kegagalan/absennya RW (fallback kosong) TIDAK menghentikan alur,
     * hanya dilewati begitu saja (UC-04a Sub-flow Notifikasi RW).
     */
    private function notifyRwFyi(Letter $letter): void
    {
        $rwId = $this->letterRepository->findCitizenRwId($letter);

        if (! $rwId) {
            return;
        }

        $rwOfficials = $this->officialRepository->allActiveRwByRwId($rwId);

        foreach ($rwOfficials as $rwOfficial) {
            $rwOfficial->user?->notify(new LetterStatusNotification(
                $letter,
                'Surat Baru (FYI)',
                'Surat warga di wilayah Anda telah disetujui RT dan diteruskan ke tahap berikutnya.',
                'rt_approved_rw_fyi',
            ));
        }
    }

    /**
     * Side-effect FYI non-blocking: setelah RT menyetujui, notifikasi hanya
     * dikirim ke Kadus aktif pada dusun citizen pemohon. Kadus bukan approver.
     */
    private function notifyKadusFyi(Letter $letter): void
    {
        $hamletId = $this->letterRepository->findCitizenHamletId($letter);

        if (! $hamletId) {
            return;
        }

        $kadusOfficials = $this->officialRepository->allActiveKadusByHamletId($hamletId);

        foreach ($kadusOfficials as $kadusOfficial) {
            $kadusOfficial->user?->notify(new LetterStatusNotification(
                $letter,
                'Surat Baru (FYI)',
                'Surat warga di dusun Anda telah disetujui RT dan diteruskan ke tahap berikutnya.',
                'rt_approved_kadus_fyi',
            ));
        }
    }

    /**
     * Resolve & notifikasi approver berikutnya secara generik lewat
     * FlowStep saat ini (sudah bertambah current_step_order-nya di
     * momen pemanggilan method ini) — mencakup otomatis kasus
     * Kepala Desa/Sekdes tanpa RtApprovalService perlu tahu detail
     * resolusinya (OfficialService::resolveNextOfficials, EV5-4-S1/S5).
     */
    private function notifyNextApprovers(Letter $letter, FlowStep $step): void
    {
        $nextOfficials = $this->letterFlowService->eligibleApprovers($step, $letter);

        foreach ($nextOfficials as $nextOfficial) {
            $nextOfficial->user?->notify(new LetterStatusNotification(
                $letter,
                'Surat Baru',
                'Ada surat yang menunggu persetujuan Anda.',
                'rt_approved',
            ));
        }
    }

    private function notifyApplicant(Letter $letter, string $status): void
    {
        $citizenUser = $this->officialService->resolveCitizenUser($letter);

        if (! $citizenUser) {
            return;
        }

        if ($status === 'approved') {
            $citizenUser->notify(new LetterStatusNotification(
                $letter,
                'Permohonan Diproses',
                'Permohonan surat Anda telah disetujui oleh RT dan sedang diproses ke tahap berikutnya.',
                'rt_approved',
            ));

            return;
        }

        $citizenUser->notify(new LetterStatusNotification(
            $letter,
            'Permohonan Ditolak',
            'Permohonan surat Anda ditolak oleh RT.',
            'rt_rejected',
        ));
    }
}
