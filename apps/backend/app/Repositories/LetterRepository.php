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
        return $letter->load(['letterType', 'citizen.occupation', 'village']);
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
            'citizen.occupation',
            'letterType',
            'approvals.approvedBy:id,name',
            'approvals.flowStep',
            'flow.steps',
            'statusLogs.actor:id,name',
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
                'citizen.occupation',
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
     * (LetterService::scopedQuery(), EV5-4-S7) menambahkan scope
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
            ->with(['citizen.occupation', 'letterType', 'approvals.approvedBy:id,name', 'approvals.flowStep', 'flow.steps', 'user']);

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
     * LetterService::scopedQuery() case 'rw': read-only histori
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
            ->with(['citizen.occupation', 'letterType', 'approvals.approvedBy:id,name', 'approvals.flowStep', 'flow.steps', 'user']);
    }

    /**
     * All letters in an RT's territory, including pending, processed, and
     * rejected history.
     */
    public function queryByCitizenRt(int $rtId): Builder
    {
        return Letter::query()
            ->whereHas('citizen', fn (Builder $q) => $q->where('rt_id', $rtId))
            ->with(['citizen.occupation', 'letterType', 'approvals.approvedBy:id,name', 'approvals.flowStep', 'flow.steps', 'user']);
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
            ->with(['citizen.occupation', 'letterType', 'approvals.approvedBy:id,name', 'approvals.flowStep', 'flow.steps', 'user']);
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
                'letterType:id,name,code,assigned_role,produces_letter,data_action,form_fields,signature_slots,supporting_template,documents,issues_letter_number,signed_by_village_head',
                'approvals.approvedBy:id,name',
                'flow.steps',
                'statusLogs.actor:id,name',
                'attachments',
                'signatures',
            ])
            ->findOrFail($id);
    }

    public function delete(Letter $letter): bool
    {
        return $letter->delete();
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

    /**
     * Bentuk baris untuk daftar: relasi dan kolom dibatasi pada yang
     * ditampilkan tabel. Isian form, snapshot, serta NIK/alamat
     * terenkripsi hanya dimuat di detail surat.
     */
    public function forListing(Builder $query): Builder
    {
        return $query
            ->setEagerLoads([])
            ->select([
                'letters.id',
                'letters.village_id',
                'letters.letter_type_id',
                'letters.submitted_by',
                'letters.citizen_id',
                'letters.letter_number',
                'letters.applicant_name',
                'letters.notes',
                'letters.status',
                'letters.flow_id',
                'letters.current_step_order',
                'letters.rejected_at_step',
                'letters.is_overdue',
                'letters.expires_at',
                'letters.submitted_at',
                'letters.processed_at',
                'letters.fulfilled_at',
                'letters.created_at',
                'letters.updated_at',
            ])
            ->with([
                'letterType:id,name,code,data_action,signed_by_village_head',
                'citizen:id,name',
                'flow:id',
                'flow.steps:id,flow_id,step_order,approver_position,is_final',
                'approvals:id,letter_id,flow_step_id,approved_by,deadline_at',
                'approvals.flowStep:id,step_order',
            ]);
    }

    /** Pencarian bebas huruf besar/kecil pada pemohon, nomor surat, dan nama warga. */
    public function whereMatchesSearch(Builder $query, string $keyword): Builder
    {
        $like = '%'.addcslashes(mb_strtolower(trim($keyword)), '\\%_').'%';

        return $query->where(function (Builder $search) use ($like) {
            $search->whereRaw('LOWER(letters.applicant_name) LIKE ?', [$like])
                ->orWhereRaw('LOWER(letters.letter_number) LIKE ?', [$like])
                ->orWhereHas('citizen', fn (Builder $citizen) => $citizen->whereRaw('LOWER(name) LIKE ?', [$like]));
        });
    }

    /**
     * @return array<int|string, int> jumlah surat berkunci nilai kolom
     */
    public function countGroupedBy(Builder $query, string $column): array
    {
        return (clone $query)
            ->setEagerLoads([])
            ->toBase()
            ->selectRaw("letters.{$column} as group_key, COUNT(*) as aggregate")
            ->groupBy("letters.{$column}")
            ->pluck('aggregate', 'group_key')
            ->map(fn ($count): int => (int) $count)
            ->all();
    }

    /**
     * Surat aktif yang approval pada step berjalannya sudah melewati
     * tenggat; padanan SQL dari LetterService::flagOverdueLetters().
     */
    public function countOverdue(Builder $query): int
    {
        return (clone $query)
            ->setEagerLoads([])
            ->whereIn('letters.status', [LetterStatus::Pending->value, LetterStatus::InProgress->value])
            ->whereHas('approvals', fn (Builder $approval) => $approval
                ->whereNull('approved_by')
                ->where('deadline_at', '<', now())
                ->whereHas('flowStep', fn (Builder $step) => $step
                    ->whereColumn('flow_steps.step_order', 'letters.current_step_order')))
            ->count();
    }

    /**
     * Jumlah surat per periode pengajuan dan status dalam satu query.
     *
     * @param  array<string, Carbon>  $periodStarts  nama periode => awal periode
     * @return array<string, array<string, int>>
     */
    public function countByPeriodAndStatus(Builder $query, array $periodStarts): array
    {
        $base = (clone $query)->setEagerLoads([])->toBase()->select('letters.status');

        foreach ($periodStarts as $period => $start) {
            $base->selectRaw("SUM(CASE WHEN letters.submitted_at >= ? THEN 1 ELSE 0 END) as period_{$period}", [$start]);
        }

        $rows = $base
            ->where('letters.submitted_at', '>=', collect($periodStarts)->min())
            ->groupBy('letters.status')
            ->get();

        $result = [];

        foreach (array_keys($periodStarts) as $period) {
            $counts = ['total' => 0];

            foreach (LetterStatus::cases() as $status) {
                $counts[$status->value] = (int) ($rows->firstWhere('status', $status->value)?->{"period_{$period}"} ?? 0);
                $counts['total'] += $counts[$status->value];
            }

            $result[$period] = $counts;
        }

        return $result;
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

    /**
     * Jumlah surat per tanggal pengajuan dalam satu query, berkunci
     * tanggal (Y-m-d). Tanggal tanpa surat tidak ikut dikembalikan.
     *
     * @return array<string, int>
     */
    public function countSubmittedPerDay(Builder $query, Carbon $from, Carbon $to): array
    {
        return (clone $query)
            ->setEagerLoads([])
            ->toBase()
            ->whereDate('letters.submitted_at', '>=', $from)
            ->whereDate('letters.submitted_at', '<=', $to)
            ->selectRaw('DATE(letters.submitted_at) as submitted_day, COUNT(*) as aggregate')
            ->groupBy('submitted_day')
            ->pluck('aggregate', 'submitted_day')
            ->mapWithKeys(fn ($count, $day): array => [substr((string) $day, 0, 10) => (int) $count])
            ->all();
    }
}
