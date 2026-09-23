<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Repositories\LetterRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * EV5-4-S6. Rewrite total dari versi lama - lihat Migrasi 4.6 di
 * backlog. Perbedaan inti dari versi lama:
 *  - Filter berbasis flow_steps.approver_position + is_final (bukan
 *    lagi letter_types.assigned_role == 'rw', bug yang tercatat di
 *    Audit §3.4).
 *  - Menulis status generik LetterStatus::Approved/Rejected (bukan
 *    lagi KasiApproved/KasiRejected) - lihat kasi/letter-detail.yaml.
 *  - Notifikasi monitoring dikirim ke Kepala Desa DAN Sekretaris Desa
 *    (dulu hanya Kepala Desa).
 */
class KasiApprovalService
{
    private const AUTHORIZED_POSITIONS = ['kasi_pelayanan', 'kaur_tu_umum'];

    public function __construct(
        protected OfficialService $officialService,
        protected LetterRepository $letterRepository,
    ) {}

    public function getPendingLetters(User $user): Collection
    {
        $official = $this->authorizeOfficial($user);

        return $this->letterRepository
            ->queryPendingAtFinalStepPosition($official->position, $official->village_id)
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
     * Keputusan FINAL Kasi/Kaur. Berbeda dari KadesApprovalService yang
     * memajukan current_step_order ke step berikutnya, di sini tidak
     * ada step berikutnya - satu-satunya penanda "sudah diputuskan"
     * adalah kolom status (lihat catatan di
     * LetterRepository::queryPendingAtFinalStepPosition()), karena itu
     * guard konkurensi memeriksa ulang status (bukan current_step_order)
     * setelah row dikunci.
     */
    public function decision(Letter $letter, User $user, array $data): void
    {
        $official = $this->authorizeOfficial($user);

        if ($letter->village_id !== $official->village_id) {
            abort(403, 'Anda tidak berwenang memproses surat ini.');
        }

        $step = $this->letterRepository->findCurrentFlowStep($letter);

        if (! $step || $step->approver_position !== $official->position || ! $step->is_final) {
            abort(409, 'Surat ini tidak sedang berada di tahap final Kasi/Kaur.');
        }

        if (! isset($data['status']) || ! in_array($data['status'], ['approved', 'rejected'], true)) {
            abort(422, 'Status keputusan tidak valid.');
        }

        if ($data['status'] === 'rejected' && (! isset($data['notes']) || trim($data['notes']) === '')) {
            abort(422, 'Alasan penolakan wajib diisi.');
        }

        DB::transaction(function () use ($letter, $user, $official, $data, $step) {

            $locked = $this->letterRepository->findForUpdateOrFail($letter->id);

            if (! in_array($locked->status, [LetterStatus::Pending, LetterStatus::InProgress], true)) {
                abort(409, 'Surat ini sudah diputuskan sebelumnya.');
            }

            $oldStatus = $locked->status->value;

            $this->letterRepository->createApprovalForLetter($locked, [
                'approved_by' => $user->id,
                'approval_level' => $official->position,
                'flow_step_id' => $step->id,
                'action' => $data['status'],
                'notes' => $data['notes'] ?? null,
            ]);

            if ($data['status'] === 'approved') {
                $this->finalizeApproval($locked);
            } else {
                $this->finalizeRejection($locked, $step->step_order);
            }

            $this->letterRepository->createStatusLogForLetter($locked, [
                'actor_id' => $user->id,
                'old_status' => $oldStatus,
                'new_status' => $locked->status->value,
                'reason' => $data['notes'] ?? null,
            ]);

            $this->notifyOutcome($locked, $data['status']);
        });
    }

    private function finalizeApproval(Letter $letter): void
    {
        $letterNumber = sprintf(
            '%03d/%s/%d',
            $letter->id,
            strtoupper($letter->letterType->code),
            now()->year
        );

        $expiresAt = $letter->letterType->validity_days
            ? now()->addDays($letter->letterType->validity_days)
            : null;

        $this->letterRepository->update($letter, [
            'status' => LetterStatus::Approved,
            'letter_number' => $letterNumber,
            'expires_at' => $expiresAt,
            'processed_at' => now(),
        ]);
    }

    private function finalizeRejection(Letter $letter, int $stepOrder): void
    {
        $this->letterRepository->update($letter, [
            'status' => LetterStatus::Rejected,
            'rejected_at_step' => $stepOrder,
            'processed_at' => now(),
        ]);
    }

    private function notifyOutcome(Letter $letter, string $status): void
    {
        $citizenUser = $this->officialService->resolveCitizenUser($letter);

        if ($status === 'approved') {

            if ($citizenUser) {
                $citizenUser->notify(new LetterStatusNotification(
                    $letter,
                    'Permohonan Disetujui',
                    'Permohonan surat Anda telah selesai diproses oleh operator. Silakan ambil ke kantor desa.',
                    'kasi_approved'
                ));
            }

            foreach ($this->officialService->resolveVillageMonitoringOfficials($letter->village_id) as $official) {
                if (! $official->user) {
                    continue;
                }

                $official->user->notify(new LetterStatusNotification(
                    $letter,
                    'Monitoring Surat',
                    'Surat telah selesai diproses oleh Kasi/Kaur.',
                    'kasi_approved'
                ));
            }

            return;
        }

        if ($citizenUser) {
            $citizenUser->notify(new LetterStatusNotification(
                $letter,
                'Permohonan Ditolak',
                'Permohonan surat Anda ditolak oleh Kasi/Kaur.',
                'kasi_rejected'
            ));
        }
    }

    private function authorizeOfficial(User $user): Official
    {
        $official = $this->officialService->getCurrentOfficial($user);

        if (! in_array($official->position, self::AUTHORIZED_POSITIONS, true)) {
            abort(403, 'Anda tidak berwenang mengakses approval Kasi/Kaur.');
        }

        if (! $official->village_id) {
            abort(403, 'Data wilayah desa tidak ditemukan.');
        }

        return $official;
    }
}
