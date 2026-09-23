<?php

namespace App\Services;

use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Policies\LetterPolicy;
use App\Repositories\ApprovalFlowRepository;
use App\Repositories\LetterRepository;
use App\Repositories\LetterStatusLogRepository;
use App\Repositories\LetterTypeRepository;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class LetterService
{
    public function __construct(
        protected OfficialService $officialService,
        protected LetterRepository $letterRepository,
        protected LetterStatusLogRepository $letterStatusLogRepository,
        protected LetterTypeRepository $letterTypeRepository,
        protected ApprovalFlowRepository $approvalFlowRepository,
        protected ApprovalSettingService $approvalSettingService,
    ) {}

    public function createLetter(array $data): Letter
    {
        return DB::transaction(function () use ($data) {

            $user = auth()->user();

            $citizen = $user->citizen;

            $letterType = $this->letterTypeRepository->findOrFail(
                $data['letter_type_id']
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

                'purpose' => $data['purpose'],

                'payload' => $data['payload'] ?? null,

                'notes' => $data['notes'] ?? null,

                'status' => 'pending',

                // Snapshot flow_id dari letter type saat submit — dikunci,
                // tidak boleh ikut berubah walau letter_types.flow_id
                // berubah di kemudian hari (lihat LettersMigrationTest).
                'flow_id' => $letterType->flow_id,

                'submitted_at' => now(),

            ]);

            $this->letterStatusLogRepository->create([

                'letter_id' => $letter->id,

                'actor_id' => $user->id,

                'old_status' => null,

                'new_status' => 'pending',

                'reason' => 'Permohonan surat dibuat',

            ]);

            $this->createFirstApproval($letter);

            $this->notifyFirstApprovers($letter);

            return $letter;

        });
    }

    private function createFirstApproval(Letter $letter): void
    {
        $step = $this->firstStepOf($letter);

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
     * Notifikasi ke SEMUA official yang berwenang atas step pertama
     * (bisa lebih dari satu — mis. kepala_desa DAN sekdes bila flow
     * kebetulan langsung mulai dari step itu, lihat
     * OfficialService::resolveOfficialsForStep), bukan hardcode "RT"
     * seperti implementasi lama (notifyRt()).
     */
    private function notifyFirstApprovers(Letter $letter): void
    {
        $step = $this->firstStepOf($letter);

        if (! $step) {
            return;
        }

        $officials = $this->officialService->resolveOfficialsForStep($step, $letter);

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
     * Titik tunggal "step pertama dari flow yang sudah di-snapshot ke
     * surat ini". Dipakai oleh createFirstApproval() dan
     * notifyFirstApprovers() supaya keduanya selalu membaca step yang
     * persis sama, bukan dua query terpisah yang bisa drift.
     *
     * findWithSteps() (bukan $letter->flow lazy-load) dipakai sesuai
     * arahan docblock ApprovalFlow::steps(): "dipakai LetterService
     * saat submit surat (snapshot flow_id)".
     */
    private function firstStepOf(Letter $letter): ?FlowStep
    {
        if (! $letter->flow_id) {
            return null;
        }

        $flow = $this->approvalFlowRepository->findWithSteps($letter->flow_id);

        return $flow?->steps->first();
    }

    /**
     * EV5-4-S7. Rewrite total dari switch lama yang salah menggabungkan
     * kasi_pelayanan/kaur_tu_umum/petugas_desa/sekretaris_desa/
     * kepala_desa jadi satu case "lihat semua surat" (TDD-01 Table 3 -
     * Scope Monitoring Surat per Role, paths/letters/letters.yaml).
     * Setiap role berbasis posisi kini di-scope KE STEP AKTIF mereka
     * sendiri lewat LetterRepository::findByFlowStepAndStatus(), bukan
     * full visibility - kecuali petugas_desa yang memang tetap full
     * visibility, dan kadus yang tidak lagi punya scope approval sama
     * sekali (dihapus total, lihat paths/letters/letters.yaml).
     */
    public function getScopedLetters(
        User $user,
        array $filters = []
    ): Collection {
        $query = match ($user->role) {
            'warga' => $this->scopeForWarga($user),
            'rt' => $this->scopeForRt($user),
            'rw' => $this->scopeForRw($user),
            'kepala_desa', 'sekretaris_desa' => $this->scopeForKadesSekdes($user),
            'kasi_pelayanan', 'kaur_tu_umum' => $this->scopeForKasiKaur($user),
            'petugas_desa' => $this->letterRepository->queryForList(),
            default => abort(403, 'Anda tidak berwenang mengakses daftar surat ini.'),
        };

        $this->applyFilters($query, $filters);

        $letters = $query
            ->latest()
            ->get();

        $this->flagOverdueLetters($letters);

        return $letters;
    }

    private function scopeForWarga(User $user): Builder
    {
        $query = $this->letterRepository->queryForList();

        $this->letterRepository->whereSubmittedBy($query, $user->id);

        return $query;
    }

    /**
     * RT: surat wilayahnya (via citizens.rt_id) yang SEDANG berada di
     * step 'rt' - bukan seluruh riwayat surat warga di RT-nya seperti
     * implementasi lama (whereCitizenRtId() murni tanpa filter step).
     */
    private function scopeForRt(User $user): Builder
    {
        $official = $this->officialService->getCurrentRt($user);

        return $this->letterRepository
            ->findByFlowStepAndStatus('rt', ['pending', 'in_progress'])
            ->whereHas('citizen', fn (Builder $q) => $q->where('rt_id', $official->rt_id));
    }

    /**
     * RW: BUKAN approver - read-only histori FYI, tanpa filter status
     * aktif sama sekali. Jalur khusus /rw/letters memakai scope histori
     * yang sama melalui RwFyiService.
     */
    private function scopeForRw(User $user): Builder
    {
        $official = $this->officialService->getCurrentRw($user);

        return $this->letterRepository->queryByCitizenRw($official->rw_id);
    }

    private function scopeForKadesSekdes(User $user): Builder
    {
        $official = $this->officialService->getCurrentOfficial($user);

        return $this->letterRepository
            ->findByFlowStepAndStatus('kepala_desa', ['pending', 'in_progress'])
            ->where('village_id', $official->village_id);
    }

    private function scopeForKasiKaur(User $user): Builder
    {
        $official = $this->officialService->getCurrentOfficial($user);

        return $this->letterRepository
            ->findByFlowStepAndStatus($official->position, ['pending', 'in_progress'])
            ->where('village_id', $official->village_id);
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

        if (! empty($filters['applicant_name'])) {

            $query->where(
                'applicant_name',
                'like',
                '%'.$filters['applicant_name'].'%'
            );

        }
    }

    private function flagOverdueLetters(Collection $letters): void
    {
        $letters->each(function ($letter) {

            $approval = $letter->approvals
                ->whereNull('approved_by')
                ->sortBy('deadline_at')
                ->first();

            $letter->is_overdue =
                $approval &&
                $approval->deadline_at &&
                now()->greaterThan($approval->deadline_at);

        });
    }

    public function getForShow(int $id): Letter
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

        return $this->letterRepository->delete($letter);
    }

    private function guardCanDelete(Letter $letter, User $user): void
    {
        if (! (new LetterPolicy)->delete($user, $letter)) {
            abort(403, 'Anda tidak berwenang menghapus surat ini.');
        }
    }
}
