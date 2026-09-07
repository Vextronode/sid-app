<?php

namespace App\Repositories;

use App\Models\Letter;
use App\Models\LetterApproval;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
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

    /**
     * Update semua approval milik surat pada level tertentu (dipakai
     * saat RT/RW/Kadus/Kasi memutuskan surat: menandai approval level
     * mereka sebagai approved_by user yang memutuskan).
     *
     * @param  bool  $onlyPending  Jika true, hanya approval yang belum
     *                             di-approve (approved_by masih null)
     *                             yang di-update - dipakai Kadus/Kasi
     *                             approval agar tidak menimpa approval
     *                             sebelumnya yang sudah selesai.
     */
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
                'citizen',
                'letterType',
                'approvals.approvedBy:id,name',
            ])
            ->findOrFail($id);
    }

    /**
     * Semua surat dengan detail lengkap (citizen, letterType,
     * approvals.approvedBy), tanpa scope tambahan - dipakai
     * KasiApprovalService::getDashboardLetters().
     */
    public function allWithDetailForApproval(): Collection
    {
        return Letter::query()
            ->with([
                'citizen',
                'letterType',
                'approvals.approvedBy:id,name',
            ])
            ->latest()
            ->get();
    }

    public function loadDetailForApproval(Letter $letter): Letter
    {
        return $letter->load([
            'citizen',
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
     * Query surat yang discope ke warga dalam sebuah dusun (hamlet)
     * tertentu (dipakai KadusApprovalService::getLetters()).
     */
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
     * Query surat berstatus tertentu, discope ke letter type dengan
     * assigned_role tertentu (dipakai
     * KasiApprovalService::getPendingLetters() - saat ini belum ada
     * pemanggil dari controller manapun, dipertahankan sesuai kode asli).
     */
    public function queryByStatusesAndLetterTypeAssignedRole(array $statuses, string $assignedRole): Builder
    {
        return Letter::query()
            ->whereIn('status', $statuses)
            ->whereHas('letterType', fn (Builder $q) => $q->where('assigned_role', $assignedRole))
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
