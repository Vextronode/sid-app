<?php

namespace App\Repositories;

use App\Enums\LetterFlowLogReason;
use App\Enums\LetterStatus;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\LetterApproval;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

class LetterRepository
{
    public function __construct()
    {
        //
    }

    public function create(array $data): Letter
    {
        return Letter::create($data);
    }

    public function find(string $id): ?Letter
    {
        return Letter::query()->find($id);
    }

    public function findOrFail(string $id): Letter
    {
        return Letter::query()->findOrFail($id);
    }

    public function findForUpdateOrFail(string $id): Letter
    {
        return Letter::query()
            ->whereKey($id)
            ->lockForUpdate()
            ->firstOrFail();
    }

    public function findCurrentFlowStep(Letter $letter): ?FlowStep
    {
        return FlowStep::query()
            ->where('flow_id', $letter->flow_id)
            ->where('step_order', $letter->current_step_order)
            ->first();
    }

    public function findCitizenRtId(Letter $letter): ?int
    {
        return $letter->citizen()->value('rt_id');
    }

    public function findCitizenRwId(Letter $letter): ?int
    {
        return $letter->citizen()
            ->join('rts', 'rts.id', '=', 'citizens.rt_id')
            ->value('rts.rw_id');
    }

    public function findCitizenHamletId(Letter $letter): ?int
    {
        return $letter->citizen()->value('hamlet_id');
    }

    public function loadForPdf(Letter $letter): Letter
    {
        return $letter->load(['letterType', 'citizen', 'village']);
    }

    public function update(Letter $letter, array $data): Letter
    {
        $letter->update($data);

        return $letter;
    }

    public function createApprovalForLetter(Letter $letter, array $data): LetterApproval
    {
        return $letter->approvals()->create($data);
    }

    public function recordDecisionForLetter(Letter $letter, array $data): LetterApproval
    {
        $pending = $letter->approvals()
            ->where('flow_step_id', $data['flow_step_id'])
            ->whereNull('approved_by')
            ->whereNull('action')
            ->latest('id')
            ->first();

        if ($pending) {
            $pending->update($data);

            return $pending;
        }

        // Compatibility for letters created before each active step had
        // its own pending approval row.
        return $this->createApprovalForLetter($letter, $data);
    }

    public function createStatusLogForLetter(Letter $letter, array $data): void
    {
        $letter->statusLogs()->create($data);
    }

    //    public function updateApprovalsByLevel(Letter $letter, string $level, array $data, bool $onlyPending = false): int
    //    {
    //        $query = $letter->approvals()->where('approval_level', $level);
    //
    //        if ($onlyPending) {
    //            $query->whereNull('approved_by');
    //        }
    //
    //        return $query->update($data);
    //    }
    //
    //    public function findWithDetailForApproval(string $id): Letter
    //    {
    //        return Letter::query()
    //            ->with([
    //                'citizen.user',
    //                'letterType',
    //                'approvals.approvedBy:id,name',
    //                'flow.steps',
    //                'statusLogs.actor:id,name',
    //            ])
    //            ->findOrFail($id);
    //    }

    public function loadDetailForApproval(Letter $letter): Letter
    {
        return $letter->load([
            'citizen.user',
            'letterType',
            'approvals.approvedBy:id,name',
            'approvals.flowStep',
            'flow.steps',
            'statusLogs.actor:id,name',
        ]);
    }

    /**
     * Query surat berstatus tertentu yang discope ke warga dalam RT
     * tertentu (dipakai DashboardService::forRt()).
     */
    public function queryByStatusesAndCitizenRt(array $statuses, int $rtId): Builder
    {
        return Letter::query()
            ->whereIn('status', $statuses)
            ->whereHas('citizen', fn (Builder $q) => $q->where('rt_id', $rtId))
            ->with([
                'citizen',
                'letterType',
                'approvals.approvedBy:id,name',
                'approvals.flowStep',
                'flow.steps',
            ]);
    }

    public function queryApprovedForAssignedRole(?string $assignedRole, string $villageId): Builder
    {
        return Letter::query()
            ->where('village_id', $villageId)
            ->where('status', LetterStatus::Approved)
            ->whereHas('letterType', function (Builder $query) use ($assignedRole) {
                $query->where('assigned_role', $assignedRole)
                    ->orWhereNull('assigned_role');
            })
            ->with([
                'citizen',
                'letterType',
                'approvals.approvedBy:id,name',
                'approvals.flowStep',
            ]);
    }

    public function countWaitingAtStep(array $positions, string $villageId, ?int $rtId = null): int
    {
        $query = Letter::query()
            ->where('village_id', $villageId)
            ->whereIn('status', [LetterStatus::Pending, LetterStatus::InProgress])
            ->whereHas('flow', function (Builder $flowQuery) use ($positions) {
                $flowQuery->whereHas('steps', function (Builder $stepQuery) use ($positions) {
                    $stepQuery->whereColumn('step_order', 'letters.current_step_order')
                        ->whereIn('approver_position', $positions);
                });
            });

        if ($rtId !== null) {
            $query->whereHas('citizen', fn (Builder $citizenQuery) => $citizenQuery->where('rt_id', $rtId));
        }

        return $query->count();
    }

    /**
     * Query surat berstatus tertentu yang discope ke warga dalam RW
     * tertentu, lewat relasi citizen.rt.rw_id. Saat ini jalur RW FYI
     * memakai queryByCitizenRw() agar seluruh histori status ikut terbaca.
     */
    //    public function queryByStatusesAndCitizenRw(array $statuses, int $rwId): Builder
    //    {
    //        return Letter::query()
    //            ->whereIn('status', $statuses)
    //            ->whereHas('citizen.rt', fn (Builder $q) => $q->where('rw_id', $rwId))
    //            ->with([
    //                'citizen',
    //                'letterType',
    //                'approvals.approvedBy:id,name',
    //            ]);
    //    }
    //
    //    /**
    //     * Query surat berstatus tertentu yang discope ke sebuah village
    //     * (dipakai Kadus/Kasi approval yang tidak berbasis RT/RW).
    //     */
    //    public function queryByStatusesAndVillage(array $statuses, string $villageId): Builder
    //    {
    //        return Letter::query()
    //            ->whereIn('status', $statuses)
    //            ->where('village_id', $villageId)
    //            ->with([
    //                'citizen',
    //                'letterType',
    //                'approvals.approvedBy:id,name',
    //            ]);
    //    }

    /**
     * Surat yang SEDANG BERADA di step approval dengan
     * approver_position termasuk salah satu dari $positions, discope
     * ke village tertentu. Generik terhadap posisi (bukan hardcode
     * 'kepala_desa') supaya bisa dipakai ulang oleh service approval
     * level manapun yang berbasis FlowStep (EV5-4-S1), termasuk
     * KadesApprovalService (EV5-4-S5) yang perlu me-resolve surat
     * berdasarkan DUA posisi sekaligus (kepala_desa DAN sekdes —
     * lihat OfficialService::resolveOfficialsForStep untuk konteks
     * "siapa cepat dia dapat").
     *
     * Hanya surat berstatus pending atau in_progress yang merupakan
     * pekerjaan approval aktif. Posisi step aktif saja tidak cukup,
     * karena surat rejected mempertahankan current_step_order.
     */
    public function queryPendingAtFlowStepPositions(
        array $positions,
        string $villageId,
        ?string $excludeSubmittedBy = null,
        ?string $excludeCitizenId = null,
    ): Builder {
        $query = Letter::query()
            ->where('village_id', $villageId)
            ->whereIn('status', [
                LetterStatus::Pending->value,
                LetterStatus::InProgress->value,
            ])
            ->whereHas('flow', function (Builder $flowQuery) use ($positions) {
                $flowQuery->whereHas('steps', function (Builder $stepQuery) use ($positions) {
                    $stepQuery->whereColumn('step_order', 'letters.current_step_order')
                        ->whereIn('approver_position', $positions);
                });
            })
            ->with([
                'citizen',
                'letterType',
                'approvals.approvedBy:id,name',
                'approvals.flowStep',
            ]);

        if ($excludeSubmittedBy !== null) {
            $query->where('submitted_by', '!=', $excludeSubmittedBy);
        }

        if ($excludeCitizenId !== null) {
            $query->where(function (Builder $citizenQuery) use ($excludeCitizenId) {
                $citizenQuery->whereNull('citizen_id')
                    ->orWhere('citizen_id', '!=', $excludeCitizenId);
            });
        }

        return $query;
    }

    public function queryByCitizenHamlet(int $hamletId): Builder
    {
        return Letter::query()
            ->whereHas('citizen', fn (Builder $q) => $q->where('hamlet_id', $hamletId))
            ->whereHas('approvals', fn (Builder $q) => $q
                ->where('approval_level', 'rt')
                ->where('action', 'approved'))
            ->with([
                'citizen',
                'letterType',
                'approvals.approvedBy:id,name',
                'approvals.flowStep',
                'flow.steps',
            ]);
    }

    /**
     * EV5-4-S0/S7. Query generik pengganti seluruh variasi
     * findByRtIdAndStatus/findByRwIdAndStatus/dst yang sebelumnya
     * tersebar per Service (nama method sesuai SID-ARCH-BE-001 S2) -
     * murni posisi+status, TANPA scope wilayah/village. Pemanggil
     * (LetterService::getScopedLetters(), EV5-4-S7) menambahkan scope
     * tambahan sendiri via whereHas (rt_id untuk RT, village_id untuk
     * Kades/Sekdes/Kasi/Kaur) - pola sama seperti
     * queryPendingAtFlowStepPositions().
     */
    public function findByFlowStepAndStatus(
        string $approverPosition,
        array $statuses,
        ?string $excludeSubmittedBy = null,
        ?string $excludeCitizenId = null,
    ): Builder {
        $query = Letter::query()
            ->whereIn('status', $statuses)
            ->whereHas('flow', function (Builder $flowQuery) use ($approverPosition) {
                $flowQuery->whereHas('steps', function (Builder $stepQuery) use ($approverPosition) {
                    $stepQuery->whereColumn('step_order', 'letters.current_step_order')
                        ->where('approver_position', $approverPosition);
                });
            })
            ->with(['citizen', 'letterType', 'approvals.approvedBy:id,name', 'approvals.flowStep', 'flow.steps', 'user']);

        if ($excludeSubmittedBy !== null) {
            $query->where('submitted_by', '!=', $excludeSubmittedBy);
        }

        if ($excludeCitizenId !== null) {
            $query->where(function (Builder $citizenQuery) use ($excludeCitizenId) {
                $citizenQuery->whereNull('citizen_id')
                    ->orWhere('citizen_id', '!=', $excludeCitizenId);
            });
        }

        return $query;
    }

    /**
     * EV5-4-S7. Semua surat (TANPA filter status) di wilayah RW
     * tertentu, via citizens.rt.rw_id - dipakai
     * LetterService::getScopedLetters() case 'rw': read-only histori
     * FYI, BUKAN filter approval aktif (RW bukan approver - lihat
     * api_spec paths/letters/letters.yaml).
     */
    public function queryByCitizenRw(int $rwId): Builder
    {
        return Letter::query()
            ->whereHas('citizen.rt', fn (Builder $q) => $q->where('rw_id', $rwId))
            ->whereHas('approvals', fn (Builder $q) => $q
                ->where('approval_level', 'rt')
                ->where('action', 'approved'))
            ->with(['citizen', 'letterType', 'approvals.approvedBy:id,name', 'approvals.flowStep', 'flow.steps', 'user']);
    }

    /**
     * All letters in an RT's territory, including pending, processed, and
     * rejected history.
     */
    public function queryByCitizenRt(int $rtId): Builder
    {
        return Letter::query()
            ->whereHas('citizen', fn (Builder $q) => $q->where('rt_id', $rtId))
            ->with(['citizen', 'letterType', 'approvals.approvedBy:id,name', 'approvals.flowStep', 'flow.steps', 'user']);
    }

    /** Letters that passed RT approval or have a recorded RT skip, in one village. */
    public function queryRtApprovedInVillage(string $villageId): Builder
    {
        return Letter::query()
            ->where('village_id', $villageId)
            ->where(function (Builder $query) {
                $query->whereHas('approvals', fn (Builder $q) => $q
                    ->where('approval_level', 'rt')
                    ->where('action', 'approved'))
                    ->orWhereHas('statusLogs', fn (Builder $q) => $q->where(
                        'reason',
                        LetterFlowLogReason::RtStageSkippedForOfficialApplicant->value,
                    ));
            })
            ->with(['citizen', 'letterType', 'approvals.approvedBy:id,name', 'approvals.flowStep', 'flow.steps', 'user']);
    }

    public function wasApprovedByRt(Letter $letter): bool
    {
        return $letter->approvals()
            ->where('approval_level', 'rt')
            ->where('action', 'approved')
            ->exists();
    }

    public function findWithApprovalActorForShow(string $id): Letter
    {
        return Letter::query()
            ->with([
                'citizen.rt',
                'letterType:id,name,code',
                'approvals.approvedBy:id,name',
                'flow.steps',
                'statusLogs.actor:id,name',
            ])
            ->findOrFail($id);
    }

    public function delete(Letter $letter): bool
    {
        return $letter->delete();
    }

    /**
     * Query dasar surat untuk sebuah desa (village).
     */
    public function queryByVillage(string $villageId): Builder
    {
        return Letter::query()->where('village_id', $villageId);
    }

    /**
     * Query surat milik desa, discope ke warga dalam sebuah RT.
     */
    public function queryByVillageAndRt(string $villageId, int $rtId): Builder
    {
        return Letter::query()
            ->where('village_id', $villageId)
            ->whereHas('citizen', function (Builder $query) use ($rtId) {
                $query->where('rt_id', $rtId);
            });
    }

    /**
     * Query surat milik desa, discope ke warga dalam sebuah RW.
     */
    public function queryByVillageAndRw(string $villageId, int $rwId): Builder
    {
        return Letter::query()
            ->where('village_id', $villageId)
            ->whereHas('citizen.rt', function (Builder $query) use ($rwId) {
                $query->where('rw_id', $rwId);
            });
    }

    /**
     * Query surat untuk daftar (index), sudah eager-load relasi yang
     * dibutuhkan tampilan daftar (citizen, letterType, approvals, user).
     */
    public function queryForList(): Builder
    {
        return Letter::query()->with([
            'citizen',
            'letterType',
            'approvals',
            'approvals.flowStep',
            'user',
        ]);
    }

    public function whereSubmittedBy(Builder $query, string $userId): Builder
    {
        return $query->where('submitted_by', $userId);
    }

    public function whereCitizenRtId(Builder $query, int $rtId): Builder
    {
        return $query->whereHas('citizen', fn (Builder $q) => $q->where('rt_id', $rtId));
    }

    public function whereCitizenRwId(Builder $query, int $rwId): Builder
    {
        return $query->whereHas('citizen.rt', fn (Builder $q) => $q->where('rw_id', $rwId));
    }

    public function countSubmittedOnDate(Builder $query, Carbon $date): int
    {
        return (clone $query)->whereDate('submitted_at', $date)->count();
    }

    public function querySubmittedBy(string $userId): Builder
    {
        return Letter::query()
            ->where('submitted_by', $userId)
            ->with([
                'letterType',
                'flow.steps',
            ]);
    }

    public function countByVillageInMonth(string $villageId): int
    {
        return Letter::query()
            ->where('village_id', $villageId)
            ->whereBetween('submitted_at', [
                now()->startOfMonth(),
                now()->endOfMonth(),
            ])
            ->count();
    }

    /**
     * @param  array<int, string>  $statuses
     * @return array<string, int>
     */
    public function countByVillageAndStatuses(string $villageId, array $statuses): array
    {
        $counts = Letter::query()
            ->where('village_id', $villageId)
            ->whereIn('status', $statuses)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->map(fn ($count): int => (int) $count)
            ->all();

        return collect($statuses)
            ->mapWithKeys(fn (string $status): array => [$status => $counts[$status] ?? 0])
            ->all();
    }
}
