<?php

namespace App\Services;

use App\Enums\LetterFlowLogReason;
use App\Enums\LetterStatus;
use App\Enums\UserRole;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Policies\LetterPolicy;
use App\Repositories\LetterRepository;
use App\Repositories\LetterStatusLogRepository;
use App\Repositories\LetterTypeRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class LetterService
{
    public const DEFAULT_PER_PAGE = 20;

    /** current_step_order saat surat masih menunggu tanda tangan. */
    public const AWAITING_SIGNATURES_STEP = 0;

    public function __construct(
        protected OfficialService $officialService,
        protected LetterRepository $letterRepository,
        protected LetterStatusLogRepository $letterStatusLogRepository,
        protected LetterTypeRepository $letterTypeRepository,
        protected ApprovalSettingService $approvalSettingService,
        protected LetterFlowService $letterFlowService,
        protected LetterAttachmentService $letterAttachmentService,
        protected LetterSignatureService $letterSignatureService,
    ) {}

    public function createLetter(array $data): Letter
    {
        $created = null;

        try {
            return DB::transaction(function () use ($data, &$created) {
                return $this->createLetterInTransaction($data, $created);
            });
        } catch (\Throwable $exception) {
            // Baris lampiran ikut di-rollback, tetapi berkasnya sudah
            // tertulis di disk dan harus dibersihkan sendiri.
            if ($created !== null) {
                $this->letterAttachmentService->deleteFilesFor($created);
            }

            throw $exception;
        }
    }

    private function createLetterInTransaction(array $data, ?Letter &$created): Letter
    {
        $user = auth()->user();

        $citizen = $user->citizen;

        if ($citizen === null) {
            abort(422, 'Akun Anda belum terhubung ke data kependudukan.');
        }

        $letterType = $this->letterTypeRepository->findOrFail(
            $data['letter_type_id'],
            $user->village_id,
        );

        $letter = $this->letterRepository->create([

            'village_id' => $user->village_id,

            'letter_type_id' => $letterType->id,

            'submitted_by' => $user->id,

            'citizen_id' => $citizen->id,

            'applicant_name' => $citizen->name,

            'applicant_nik' => $citizen->nik,

            'applicant_nik_hash' => $citizen->nik_hash,

            'applicant_address' => $citizen->address,

            // Keperluan dan catatan bukan lagi isian umum; bila sebuah jenis
            // surat memerlukannya, ia menjadi isian di payload.
            'purpose' => null,

            'payload' => $data['payload'] ?? null,

            'notes' => null,

            'status' => 'pending',

            'current_step_order' => 1,

            // Snapshot flow_id dari letter type saat submit — dikunci,
            // tidak boleh ikut berubah walau letter_types.flow_id
            // berubah di kemudian hari (lihat LettersMigrationTest).
            'flow_id' => $letterType->flow_id,

            'submitted_at' => now(),

        ]);
        $created = $letter;

        $this->letterStatusLogRepository->create([

            'letter_id' => $letter->id,

            'actor_id' => $user->id,

            'old_status' => null,

            'new_status' => 'pending',

            'reason' => 'Permohonan surat dibuat',

        ]);

        $this->letterAttachmentService->storeSubmission(
            $letter,
            $user,
            $data['files'] ?? [],
        );

        $this->letterSignatureService->openForSubmission(
            $letter,
            $user,
            $data['signers'] ?? [],
            $data['signature_files'] ?? [],
        );

        if (! $this->letterSignatureService->isComplete($letter)) {
            return $this->holdForSignatures($letter, $user);
        }

        return $this->startApproval($letter, $user);
    }

    /**
     * Dipanggil setelah sebuah slot tanda tangan terisi (disetujui pemilik
     * NIK atau diganti TTD basah). Begitu semua slot terisi, surat yang
     * tertahan masuk ke tahap approval pertama.
     */
    public function beginApprovalIfSigned(Letter $letter, User $actor): Letter
    {
        return DB::transaction(function () use ($letter, $actor): Letter {
            $locked = $this->letterRepository->findForUpdateOrFail($letter->id);
            $locked->load('letterType');

            if (
                $locked->status !== LetterStatus::Pending
                || $locked->current_step_order !== self::AWAITING_SIGNATURES_STEP
                || ! $this->letterSignatureService->isComplete($locked)
            ) {
                return $locked;
            }

            return $this->startApproval($locked, $actor);
        });
    }

    /**
     * Surat belum boleh masuk ke approver selama masih ada slot tanda
     * tangan yang kosong: current_step_order 0 berarti "menunggu tanda
     * tangan", sehingga tidak ada step flow yang cocok dan tidak ada
     * approver yang dapat memprosesnya.
     */
    private function holdForSignatures(Letter $letter, User $actor): Letter
    {
        $letter = $this->letterRepository->update($letter, [
            'current_step_order' => self::AWAITING_SIGNATURES_STEP,
        ]);

        $this->letterStatusLogRepository->create([
            'letter_id' => $letter->id,
            'actor_id' => $actor->id,
            'old_status' => 'pending',
            'new_status' => 'pending',
            'reason' => LetterFlowLogReason::AwaitingSignatures->value,
        ]);

        return $letter;
    }

    private function startApproval(Letter $letter, User $actor): Letter
    {
        $start = $this->letterFlowService->resolveStartStep($letter);
        $step = $start['step'];

        if ($step === null) {
            // Flow tanpa step tidak punya approver; surat akan menggantung
            // selamanya bila tetap dibuat.
            abort(422, 'Jenis surat ini belum memiliki alur persetujuan. Hubungi '.UserRole::stafSidLabel().'.');
        }

        $letter = $this->letterRepository->update($letter, [
            'current_step_order' => $step->step_order,
        ]);

        $this->letterFlowService->logSkipped($letter, $start['skipped'], $actor);
        $this->createFirstApproval($letter, $step);

        if ($start['vacant']) {
            $this->holdForVacantStep($letter, $actor);
        } else {
            $this->notifyFirstApprovers($letter, $step);
        }

        return $letter;
    }

    private function createFirstApproval(Letter $letter, ?FlowStep $step): void
    {
        if (! $step) {
            return;
        }

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

    /**
     * Step pertama belum punya pejabat aktif (mis. RT kosong atau warga
     * belum terdaftar di RT mana pun). Surat ditahan di step itu dan
     * Petugas Desa diberi tahu untuk mengisi jabatannya; step tidak
     * dilewati agar verifikasi tingkat RT tetap terjadi.
     */
    private function holdForVacantStep(Letter $letter, User $actor): void
    {
        $this->letterStatusLogRepository->create([
            'letter_id' => $letter->id,
            'actor_id' => $actor->id,
            'old_status' => 'pending',
            'new_status' => 'pending',
            'reason' => LetterFlowLogReason::HeldForVacantApprover->value,
        ]);

        foreach ($this->officialService->resolveStafSidUsers($letter->village_id) as $petugas) {
            $petugas->notify(new LetterStatusNotification(
                $letter,
                'Surat Tertahan: Pejabat RT Kosong',
                'Ada permohonan surat yang tertahan karena RT di wilayah pemohon belum memiliki pejabat aktif. Tetapkan pejabat RT agar surat dapat diproses.',
                'approver_vacant',
            ));
        }
    }

    /**
     * Notifikasi ke SEMUA official yang berwenang atas step pertama
     * (bisa lebih dari satu, misalnya tahap kepala_desa yang mencakup
     * pejabat Kepala Desa dan Sekdes; lihat
     * OfficialService::resolveOfficialsForStep), bukan hardcode "RT"
     * seperti implementasi lama (notifyRt()).
     */
    private function notifyFirstApprovers(Letter $letter, ?FlowStep $step): void
    {
        if (! $step) {
            return;
        }

        $officials = $this->letterFlowService->eligibleApprovers($step, $letter);

        foreach ($officials as $official) {
            if (! $official->user) {
                continue;
            }

            $official->user->notify(
                new LetterStatusNotification(
                    $letter,
                    'Permohonan Surat Baru',
                    'Ada permohonan surat baru yang menunggu verifikasi Anda.',
                    'pending'
                )
            );
        }
    }

    /**
     * EV5-4-S7. Rewrite total dari switch lama yang salah menggabungkan
     * kasi_pelayanan/kaur_tu_umum/staf_sid/sekretaris_desa/
     * kepala_desa jadi satu case "lihat semua surat" (TDD-01 Table 3 -
     * Scope Monitoring Surat per Role, paths/letters/letters.yaml).
     * Daftar role dibatasi per wilayah dan tahap yang telah dicapai;
     * pemohon dapat memilih scope=mine lintas-role.
     */
    public function paginateScopedLetters(User $user, array $filters = []): LengthAwarePaginator
    {
        $query = $this->scopedQuery($user, $filters);

        $this->applyFilters($query, $filters);

        $letters = $this->letterRepository
            ->forListing($query)
            ->latest()
            ->paginate((int) ($filters['per_page'] ?? self::DEFAULT_PER_PAGE));

        $this->flagOverdueLetters($letters->getCollection());

        return $letters;
    }

    /**
     * Angka ringkasan untuk dashboard, dihitung di database atas scope
     * yang sama persis dengan daftar surat (per role/wilayah), sehingga
     * kartu statistik dan daftar selalu konsisten tanpa mengirim
     * seluruh baris ke klien.
     *
     * @return array{total: int, by_status: array<string, int>, overdue: int, by_type: array<int, array{id: int, name: ?string, total: int}>, by_period: array<string, array<string, int>>}
     */
    public function summarizeScopedLetters(User $user, array $filters = []): array
    {
        $query = $this->scopedQuery($user, $filters);

        $byStatus = $this->letterRepository->countGroupedBy($query, 'status');
        $byType = $this->letterRepository->countGroupedBy($query, 'letter_type_id');
        $typeNames = $this->letterTypeRepository->namesByIds(array_keys($byType));

        return [
            'total' => array_sum($byStatus),
            'by_status' => collect(LetterStatus::cases())
                ->mapWithKeys(fn (LetterStatus $status): array => [$status->value => $byStatus[$status->value] ?? 0])
                ->all(),
            'overdue' => $this->letterRepository->countOverdue($query),
            'by_type' => collect($byType)
                ->map(fn (int $total, int|string $id): array => [
                    'id' => (int) $id,
                    'name' => $typeNames[$id] ?? null,
                    'total' => $total,
                ])
                ->sortBy('name')
                ->values()
                ->all(),
            'by_period' => $this->letterRepository->countByPeriodAndStatus($query, [
                'day' => now()->startOfDay(),
                'week' => now()->subDays(7),
                'month' => now()->startOfMonth(),
            ]),
        ];
    }

    /**
     * Scope daftar surat per role, tanpa filter tampilan maupun eager-load
     * final; dipakai bersama oleh daftar berpaginasi dan ringkasan.
     */
    private function scopedQuery(User $user, array $filters): Builder
    {
        if (($filters['scope'] ?? null) === 'mine') {
            $query = $this->scopeForWarga($user);
        } else {
            $query = match ($user->role) {
                'warga' => $this->scopeForWarga($user),
                'rt' => $this->scopeForRt($user),
                'rw' => $this->scopeForRw($user),
                'kadus' => $this->scopeForKadus($user),
                'kepala_desa', 'sekretaris_desa' => $this->scopeForKadesSekdes($user),
                'kasi_pelayanan', 'kaur_tu_umum' => $this->scopeForKasiKaur($user),
                'staf_sid' => $this->letterRepository
                    ->queryForList()
                    ->where('village_id', $user->official?->village_id),
                default => abort(403, 'Anda tidak berwenang mengakses daftar surat ini.'),
            };
        }

        return $query;
    }

    private function scopeForWarga(User $user): Builder
    {
        $query = $this->letterRepository->queryForList();

        $this->letterRepository->whereSubmittedBy($query, $user->id);

        return $query;
    }

    /**
     * RT: seluruh surat dari citizen dalam wilayah rt_id pejabat tersebut,
     * termasuk yang masih menunggu keputusan dan seluruh riwayat prosesnya.
     */
    private function scopeForRt(User $user): Builder
    {
        $official = $this->officialService->getCurrentRt($user);

        return $this->letterRepository->queryByCitizenRt($official->rt_id);
    }

    /**
     * RW: read-only histori surat di wilayahnya yang sudah disetujui RT;
     * status setelah keputusan RT tidak membatasi riwayat yang ditampilkan.
     */
    private function scopeForRw(User $user): Builder
    {
        $official = $this->officialService->getCurrentRw($user);

        return $this->letterRepository->queryByCitizenRw($official->rw_id);
    }

    private function scopeForKadus(User $user): Builder
    {
        $official = $this->officialService->getCurrentOfficial($user);

        if (! $official->hamlet_id) {
            abort(403, 'Data wilayah dusun tidak ditemukan.');
        }

        return $this->letterRepository->queryByCitizenHamlet($official->hamlet_id);
    }

    private function scopeForKadesSekdes(User $user): Builder
    {
        $official = $this->officialService->getCurrentOfficial($user);

        return $this->letterRepository->queryRtApprovedInVillage($official->village_id);
    }

    private function scopeForKasiKaur(User $user): Builder
    {
        $official = $this->officialService->getCurrentOfficial($user);

        return $this->letterRepository
            ->queryApprovedForAssignedRole($user->role, $official->village_id);
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        if (! empty($filters['status'])) {

            $query->where(
                'status',
                $filters['status']
            );

        }

        if (! empty($filters['letter_type_id'])) {

            $query->where(
                'letter_type_id',
                $filters['letter_type_id']
            );

        }

        if (! empty($filters['from'])) {

            $query->whereDate(
                'submitted_at',
                '>=',
                $filters['from']
            );

        }

        if (! empty($filters['to'])) {

            $query->whereDate(
                'submitted_at',
                '<=',
                $filters['to']
            );

        }

        // Klien mengirim awal/akhir hari menurut zona waktunya sendiri,
        // sehingga "surat tanggal 10" tepat walau disimpan dalam UTC.
        if (! empty($filters['submitted_from'])) {
            $query->where('submitted_at', '>=', $this->toAppTime($filters['submitted_from']));
        }

        if (! empty($filters['submitted_to'])) {
            $query->where('submitted_at', '<=', $this->toAppTime($filters['submitted_to']));
        }

        if (! empty($filters['search'])) {
            $this->letterRepository->whereMatchesSearch($query, $filters['search']);
        }

        if (! empty($filters['applicant_name'])) {

            $query->where(
                'applicant_name',
                'like',
                '%'.$filters['applicant_name'].'%'
            );

        }
    }

    private function toAppTime(string $value): Carbon
    {
        return Carbon::parse($value)->setTimezone(config('app.timezone'));
    }

    private function flagOverdueLetters(Collection $letters): void
    {
        $letters->each(function ($letter) {
            $isActive = in_array($letter->status->value, [
                LetterStatus::Pending->value,
                LetterStatus::InProgress->value,
            ], true);

            $currentStepOrder = $isActive ? $letter->current_step_order : null;
            $approval = $currentStepOrder === null
                ? null
                : $letter->approvals->first(fn ($candidate) => $candidate->flowStep?->step_order === $currentStepOrder
                    && $candidate->approved_by === null
                );

            $letter->is_overdue = (bool) (
                $approval?->deadline_at && now()->greaterThan($approval->deadline_at)
            );

        });
    }

    public function getForShow(string $id): Letter
    {
        return $this->letterRepository->findWithApprovalActorForShow($id);
    }

    /**
     * Aturan otorisasi penghapusan surat kini didefinisikan satu kali
     * di LetterPolicy@delete (juga dipakai LetterController lewat
     * $this->authorize()). Method ini tetap melakukan guard agar
     * pemanggil yang langsung memanggil service (mis. dari command,
     * job, atau test) tetap terlindungi walau tidak lewat controller.
     */
    public function delete(Letter $letter, User $user): bool
    {
        $this->guardCanDelete($letter, $user);

        $deleted = $this->letterRepository->delete($letter);

        if ($deleted) {
            $this->letterAttachmentService->deleteFilesFor($letter);
        }

        return $deleted;
    }

    private function guardCanDelete(Letter $letter, User $user): void
    {
        if (! (new LetterPolicy)->delete($user, $letter)) {
            abort(403, 'Anda tidak berwenang menghapus surat ini.');
        }
    }
}
