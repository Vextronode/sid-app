<?php

namespace App\Repositories;

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

    public function find(int $id): ?Letter
    {
        return Letter::query()->find($id);
    }

    public function findOrFail(int $id): Letter
    {
        return Letter::query()->findOrFail($id);
    }

    public function findForUpdateOrFail(int $id): Letter
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

    public function createStatusLogForLetter(Letter $letter, array $data): void
    {
        $letter->statusLogs()->create($data);
    }

    public function updateApprovalsByLevel(Letter $letter, string $level, array $data, bool $onlyPending = false): int
    {
        $query = $letter->approvals()->where('approval_level', $level);

        if ($onlyPending) {
            $query->whereNull('approved_by');
        }

        return $query->update($data);
    }

    public function findWithDetailForApproval(int $id): Letter
    {
        return Letter::query()
            ->with([
                'citizen.user',
                'letterType',
                'approvals.approvedBy:id,name',
            ])
            ->findOrFail($id);
    }

    public function loadDetailForApproval(Letter $letter): Letter
    {
        return $letter->load([
            'citizen.user',
            'letterType',
            'approvals.approvedBy:id,name',
        ]);
    }

    public function loadDetailForRw(Letter $letter): Letter
    {
        return $letter->load([
            'citizen.rt',
            'letterType',
            'approvals.approvedBy:id,name',
        ]);
    }

    /**
     * Query surat berstatus tertentu yang discope ke warga dalam RT
     * tertentu (dipakai RtApprovalService::getPendingLetters()).
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
            ]);
    }

    /**
     * Query surat berstatus tertentu yang discope ke warga dalam RW
     * tertentu, lewat relasi citizen.rt.rw_id (dipakai
     * RwApprovalService::getPendingLetters() dan sejenisnya).
     */
    public function queryByStatusesAndCitizenRw(array $statuses, int $rwId): Builder
    {
        return Letter::query()
            ->whereIn('status', $statuses)
            ->whereHas('citizen.rt', fn (Builder $q) => $q->where('rw_id', $rwId))
            ->with([
                'citizen',
                'letterType',
                'approvals.approvedBy:id,name',
            ]);
    }

    /**
     * Query surat berstatus tertentu yang discope ke sebuah village
     * (dipakai Kadus/Kasi approval yang tidak berbasis RT/RW).
     */
    public function queryByStatusesAndVillage(array $statuses, int $villageId): Builder
    {
        return Letter::query()
            ->whereIn('status', $statuses)
            ->where('village_id', $villageId)
            ->with([
                'citizen',
                'letterType',
                'approvals.approvedBy:id,name',
            ]);
    }

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
     * Join ke flow_steps lewat flow_id + current_step_order (bukan
     * whereIn('status', [...])) - current_step_order sudah cukup
     * menunjukkan "sedang aktif di step ini" TANPA perlu filter status
     * eksplisit di sini: reject tidak pernah memajukan
     * current_step_order (lihat KadesApprovalService::decision()),
     * jadi surat yang sudah diputuskan di step SEBELUM ini otomatis
     * tidak lagi match kolom current_step_order-nya sendiri.
     */
    public function queryPendingAtFlowStepPositions(array $positions, int $villageId): Builder
    {
        return Letter::query()
            ->where('village_id', $villageId)
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
            ]);
    }

    public function queryByCitizenHamlet(int $hamletId): Builder
    {
        return Letter::query()
            ->whereHas('citizen', fn (Builder $q) => $q->where('hamlet_id', $hamletId))
            ->with([
                'citizen',
                'letterType',
                'approvals.approvedBy:id,name',
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
    public function findByFlowStepAndStatus(string $approverPosition, array $statuses): Builder
    {
        return Letter::query()
            ->whereIn('status', $statuses)
            ->whereHas('flow', function (Builder $flowQuery) use ($approverPosition) {
                $flowQuery->whereHas('steps', function (Builder $stepQuery) use ($approverPosition) {
                    $stepQuery->whereColumn('step_order', 'letters.current_step_order')
                        ->where('approver_position', $approverPosition);
                });
            })
            ->with(['citizen', 'letterType', 'approvals.approvedBy:id,name', 'user']);
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
            ->with(['citizen', 'letterType', 'approvals.approvedBy:id,name', 'user']);
    }

    /**
     * Surat yang sedang berada di step FINAL (is_final=true) dengan
     * approver_position sesuai posisi Kasi/Kaur yang memanggil,
     * discope ke village, dan belum diputuskan - dipakai
     * KasiApprovalService::getPendingLetters() (EV5-4-S6). MENGGANTIKAN
     * filter lama yang salah membandingkan ke assigned_role='rw'
     * (Audit §3.4).
     *
     * Status bisa 'pending' (flow langsung mulai di step final, tanpa
     * RT/Kades) ATAU 'in_progress' (sudah lewat RT dan/atau Kades lebih
     * dulu - lihat RtApprovalService::decision(), EV5-4-S4) - keduanya
     * berarti "belum diputuskan". Step final tidak pernah maju ke step
     * berikutnya (current_step_order tetap sama setelah diputuskan),
     * jadi status generik 'approved'/'rejected' adalah satu-satunya
     * penanda surat ini SUDAH diputuskan Kasi/Kaur.
     */
    public function queryPendingAtFinalStepPosition(string $position, int $villageId): Builder
    {
        return Letter::query()
            ->where('village_id', $villageId)
            ->whereIn('status', [LetterStatus::Pending, LetterStatus::InProgress])
            ->whereHas('flow', function (Builder $flowQuery) use ($position) {
                $flowQuery->whereHas('steps', function (Builder $stepQuery) use ($position) {
                    $stepQuery->whereColumn('step_order', 'letters.current_step_order')
                        ->where('approver_position', $position)
                        ->where('is_final', true);
                });
            })
            ->with([
                'citizen',
                'letterType',
                'approvals.approvedBy:id,name',
            ]);
    }

    public function findWithApprovalActorForShow(int $id): Letter
    {
        return Letter::query()
            ->with([
                'letterType:id,name,code',
                'approvals.approvedBy:id,name',
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
    public function queryByVillage(int $villageId): Builder
    {
        return Letter::query()->where('village_id', $villageId);
    }

    /**
     * Query surat milik desa, discope ke warga dalam sebuah RT.
     */
    public function queryByVillageAndRt(int $villageId, int $rtId): Builder
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
    public function queryByVillageAndRw(int $villageId, int $rwId): Builder
    {
        return Letter::query()
            ->where('village_id', $villageId)
            ->whereHas('citizen', function (Builder $query) use ($rwId) {
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
            'user',
        ]);
    }

    public function whereSubmittedBy(Builder $query, int $userId): Builder
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
}
