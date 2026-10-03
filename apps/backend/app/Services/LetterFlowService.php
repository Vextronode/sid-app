<?php

namespace App\Services;

use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
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
     * @return array{step: FlowStep|null, skipped: Collection<int, FlowStep>}
     */
    public function resolveStartStep(Letter $letter): array
    {
        return $this->resolveFromOrder($letter, 0);
    }

    /**
     * @return array{step: FlowStep, skipped: Collection<int, FlowStep>}
     */
    public function nextActionable(Letter $letter, int $afterOrder): array
    {
        $result = $this->resolveFromOrder($letter, $afterOrder);

        if ($result['step'] === null) {
            abort(422, 'Tahap persetujuan berikutnya tidak tersedia.');
        }

        return ['step' => $result['step'], 'skipped' => $result['skipped']];
    }

    /**
     * @param  Collection<int, FlowStep>  $skipped
     */
    public function logSkipped(Letter $letter, Collection $skipped, User $actor): void
    {
        $labels = [
            'rt' => 'RT',
            'kepala_desa' => 'Kepala Desa/Sekretaris Desa',
            'sekdes' => 'Kepala Desa/Sekretaris Desa',
        ];
        $status = $letter->status->value;

        foreach ($skipped as $step) {
            $label = $labels[$step->approver_position] ?? $step->approver_position;

            $this->letterStatusLogRepository->create([
                'letter_id' => $letter->id,
                'actor_id' => $actor->id,
                'old_status' => $status,
                'new_status' => $status,
                'reason' => "Tahap {$label} dilewati: pemohon adalah pejabat pada tahap tersebut",
            ]);
        }
    }

    /**
     * @return array{step: FlowStep|null, skipped: Collection<int, FlowStep>}
     */
    private function resolveFromOrder(Letter $letter, int $afterOrder): array
    {
        $skipped = new Collection;

        if ($letter->flow_id === null) {
            return ['step' => null, 'skipped' => $skipped];
        }

        $flow = $this->approvalFlowRepository->findWithSteps($letter->flow_id);

        foreach ($flow?->steps ?? [] as $step) {
            if ($step->step_order <= $afterOrder) {
                continue;
            }

            $rawApprovers = $this->officialService->resolveOfficialsForStep($step, $letter);
            $eligible = $rawApprovers
                ->reject(fn (Official $official) => $this->isApplicantOfficial($letter, $official));

            if ($step->is_final) {
                if ($eligible->isEmpty()) {
                    abort(422, 'Surat tidak dapat diproses: tidak ada pejabat berwenang pada tahap final.');
                }

                return ['step' => $step, 'skipped' => $skipped];
            }

            if ($rawApprovers->isNotEmpty() && $eligible->isEmpty()) {
                $skipped->push($step);

                continue;
            }

            return ['step' => $step, 'skipped' => $skipped];
        }

        return ['step' => null, 'skipped' => $skipped];
    }
}
