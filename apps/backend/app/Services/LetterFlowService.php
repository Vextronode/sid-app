<?php

namespace App\Services;

use App\Enums\LetterFlowLogReason;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Repositories\ApprovalFlowRepository;
use App\Repositories\LetterStatusLogRepository;
use Illuminate\Database\Eloquent\Collection;

class LetterFlowService
{
    public function __construct(
        protected OfficialService $officialService,
        protected ApprovalFlowRepository $approvalFlowRepository,
        protected LetterStatusLogRepository $letterStatusLogRepository,
    ) {}

    public function isApplicantOfficial(Letter $letter, Official $official): bool
    {
        return (string) $official->user_id === (string) $letter->submitted_by
            || ($letter->citizen_id !== null
                && $official->citizen_id !== null
                && (string) $official->citizen_id === (string) $letter->citizen_id);
    }

    /**
     * @return Collection<int, Official>
     */
    public function eligibleApprovers(FlowStep $step, Letter $letter): Collection
    {
        return $this->officialService
            ->resolveOfficialsForStep($step, $letter)
            ->reject(fn (Official $official) => $this->isApplicantOfficial($letter, $official))
            ->values();
    }

    /**
     * Empty-step flows remain valid for letter types that do not require approval.
     *
     * `vacant` bernilai true bila step yang dituju belum punya pejabat
     * aktif sama sekali (mis. RT kosong): surat ditahan di step itu.
     *
     * @return array{step: FlowStep|null, skipped: Collection<int, FlowStep>, vacant: bool}
     */
    public function resolveStartStep(Letter $letter): array
    {
        return $this->resolveFromOrder($letter, 0);
    }

    /**
     * @return array{step: FlowStep, skipped: Collection<int, FlowStep>, vacant: bool}
     */
    public function nextActionable(Letter $letter, int $afterOrder): array
    {
        $result = $this->resolveFromOrder($letter, $afterOrder);

        if ($result['step'] === null) {
            abort(422, 'Tahap persetujuan berikutnya tidak tersedia.');
        }

        return $result;
    }

    /**
     * Step yang dituju belum punya pejabat berwenang (RT kosong, atau
     * Kades/Sekdes pasangan pemohon kosong). Surat ditahan di step itu dan
     * Staf SIDUTama diberi tahu untuk mengisi jabatannya; begitu terisi,
     * pejabat baru langsung dapat memprosesnya. Step tidak dilewati.
     */
    public function holdForVacantStep(Letter $letter, FlowStep $step, User $actor): void
    {
        $final = $step->is_final;
        $status = $letter->status->value;

        $this->letterStatusLogRepository->create([
            'letter_id' => $letter->id,
            'actor_id' => $actor->id,
            'old_status' => $status,
            'new_status' => $status,
            'reason' => ($final ? LetterFlowLogReason::HeldForVacantFinalApprover : LetterFlowLogReason::HeldForVacantApprover)->value,
        ]);

        [$title, $body] = $final
            ? ['Surat Tertahan: Kepala Desa/Sekdes Kosong', 'Ada permohonan surat yang tertahan di tahap Kepala Desa/Sekretaris Desa karena belum ada pejabat yang berwenang menyetujuinya (pemohon tidak boleh menyetujui suratnya sendiri). Tetapkan pejabat Kepala Desa atau Sekretaris Desa agar surat dapat diproses.']
            : ['Surat Tertahan: Pejabat RT Kosong', 'Ada permohonan surat yang tertahan karena RT di wilayah pemohon belum memiliki pejabat aktif. Tetapkan pejabat RT agar surat dapat diproses.'];

        foreach ($this->officialService->resolveStafSidUsers($letter->village_id) as $petugas) {
            $petugas->notify(new LetterStatusNotification($letter, $title, $body, 'approver_vacant'));
        }
    }

    /** Pemohon adalah Kepala Desa atau Sekretaris Desa aktif di desa surat. */
    public function isVillageHeadApplicant(Letter $letter): bool
    {
        return Official::query()
            ->where('village_id', $letter->village_id)
            ->where('is_active', true)
            ->whereIn('position', ['kepala_desa', 'sekretaris_desa'])
            ->where(fn ($query) => $query
                ->where('user_id', $letter->submitted_by)
                ->when($letter->citizen_id !== null, fn ($inner) => $inner->orWhere('citizen_id', $letter->citizen_id)))
            ->exists();
    }

    /**
     * @param  Collection<int, FlowStep>  $skipped
     */
    public function logSkipped(Letter $letter, Collection $skipped, User $actor): void
    {
        $labels = [
            'rt' => 'RT',
            'kepala_desa' => 'Kepala Desa/Sekretaris Desa',
            'sekretaris_desa' => 'Kepala Desa/Sekretaris Desa',
        ];
        $status = $letter->status->value;
        $villageHead = $this->isVillageHeadApplicant($letter);

        foreach ($skipped as $step) {
            $label = $labels[$step->approver_position] ?? $step->approver_position;
            $reason = match (true) {
                $villageHead && $step->approver_position === 'rt' => LetterFlowLogReason::RtStageSkippedForVillageHeadApplicant->value,
                $step->approver_position === 'rt' => LetterFlowLogReason::RtStageSkippedForOfficialApplicant->value,
                default => "Tahap {$label} dilewati: pemohon adalah pejabat pada tahap tersebut",
            };

            $this->letterStatusLogRepository->create([
                'letter_id' => $letter->id,
                'actor_id' => $actor->id,
                'old_status' => $status,
                'new_status' => $status,
                'reason' => $reason,
            ]);
        }
    }

    /**
     * @return array{step: FlowStep|null, skipped: Collection<int, FlowStep>, vacant: bool}
     */
    private function resolveFromOrder(Letter $letter, int $afterOrder): array
    {
        $skipped = new Collection;

        if ($letter->flow_id === null) {
            return ['step' => null, 'skipped' => $skipped, 'vacant' => false];
        }

        $flow = $this->approvalFlowRepository->findWithSteps($letter->flow_id);
        $villageHead = $this->isVillageHeadApplicant($letter);

        foreach ($flow?->steps ?? [] as $step) {
            if ($step->step_order <= $afterOrder) {
                continue;
            }

            // Surat Kades/Sekdes tidak menunggu RT: langsung ke tahap final,
            // tempat keduanya saling menyetujui.
            if ($villageHead && ! $step->is_final) {
                $skipped->push($step);

                continue;
            }

            $rawApprovers = $this->officialService->resolveOfficialsForStep($step, $letter);
            $eligible = $rawApprovers
                ->reject(fn (Official $official) => $this->isApplicantOfficial($letter, $official));

            // Tahap final tidak pernah dilewati: tanpa pejabat berwenang
            // (mis. Kades mengajukan saat Sekdes kosong) surat ditahan.
            if ($step->is_final) {
                return ['step' => $step, 'skipped' => $skipped, 'vacant' => $eligible->isEmpty()];
            }

            if ($rawApprovers->isNotEmpty() && $eligible->isEmpty()) {
                $skipped->push($step);

                continue;
            }

            return ['step' => $step, 'skipped' => $skipped, 'vacant' => $rawApprovers->isEmpty()];
        }

        return ['step' => null, 'skipped' => $skipped, 'vacant' => false];
    }
}
