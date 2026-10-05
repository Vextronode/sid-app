<?php

namespace App\Services;

use App\Enums\OfficialPosition;
use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Hamlet;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use Illuminate\Database\Eloquent\Collection;

class OfficialService
{
    public function __construct(
        protected OfficialRepository $officialRepository,
        protected UserRepository $userRepository,
        protected LetterRepository $letterRepository,
    ) {}

    public function resolveRtForCitizen(Citizen $citizen)
    {
        return $this->officialRepository->findActiveRtByRtId($citizen->rt_id);
    }

    public function getCurrentOfficial(User $user): Official
    {
        return $this->officialRepository->findActiveForUserOrFail($user);
    }

    public function getCurrentRw(User $user): Official
    {
        return $this->officialRepository->findActiveForUserOrFail($user, 'rw');
    }

    public function getCurrentRt(User $user): Official
    {
        return $this->officialRepository->findActiveForUserOrFail($user, 'rt');
    }

    /**
     * EV5-4-S1. Resolve pejabat mana saja yang berwenang atas STEP
     * APPROVAL SAAT INI pada sebuah surat, dibaca murni dari
     * FlowStep::approver_position (Config over Code — SID-ARCH-SYS-001
     * S1), BUKAN hardcode match berdasarkan posisi Official pemanggil
     * seperti implementasi lama.
     *
     * Dua pola resolve dibedakan eksplisit sesuai SID-ARCH-BE-001 S3.2:
     *  - Region-based (FlowStep::isRegionBased() true, saat ini hanya
     *    untuk approver_position 'rt'): resolve berdasarkan rt_id milik
     *    citizen pemohon surat.
     *  - Position-based (selain 'rt'): resolve semua official aktif
     *    dengan position yang sama di village_id milik surat.
     *
     * Mengembalikan collect() kosong (bukan exception) bila surat tidak
     * punya flow step aktif, atau data wilayah yang dibutuhkan tidak
     * tersedia (mis. citizen_id null) — konsisten dengan perilaku
     * "unknown/tidak dapat diresolve" pada implementasi sebelumnya.
     *
     * @return Collection<int, Official>
     */
    public function resolveNextOfficials(Letter $letter): Collection
    {
        $step = $this->letterRepository->findCurrentFlowStep($letter);

        if (! $step) {
            return new Collection;
        }

        return $this->resolveOfficialsForStep($step, $letter);
    }

    /**
     * Titik tunggal abstraksi resolve officials untuk satu FlowStep
     * tertentu. Dipisah dari resolveNextOfficials() agar bisa dipakai
     * ulang langsung dengan FlowStep yang sudah di tangan (mis. saat
     * validasi gate step lain), tanpa perlu melalui objek Letter.
     *
     * EV5-4-S5: pertanyaan terbuka Sekdes (lihat
     * FlowStep::resolvablePositions()) SUDAH TERJAWAB — Kepala Desa
     * dan Sekretaris Desa saling menggantikan (first-come-first-served)
     * untuk step approver_position 'kepala_desa': siapapun di antara
     * keduanya yang memutuskan lebih dulu, step itu selesai dan yang
     * lain tidak perlu (dan tidak bisa lagi) memutuskan surat yang
     * sama. Karena itu murni soal "siapa saja yang berhak melihat &
     * memutuskan step ini", perluasannya cukup di method resolve
     * (di sini), TIDAK di FlowStep::resolvablePositions() — kolom
     * approver_position di flow_steps tetap bernilai tunggal
     * 'kepala_desa' apa adanya, guard race-condition "siapa cepat dia
     * dapat" sesungguhnya ditegakkan di KadesApprovalService::decision().
     *
     * @return Collection<int, Official>
     */
    public function resolveOfficialsForStep(FlowStep $step, Letter $letter): Collection
    {
        if ($step->isRegionBased()) {
            $rtId = $this->letterRepository->findCitizenRtId($letter);

            if (! $rtId) {
                return new Collection;
            }

            return $this->officialRepository->allActiveByPositionAndRt(
                $step->approver_position,
                $rtId,
            );
        }

        return $this->officialRepository->allActiveByPositionsAndVillage(
            $this->resolvablePositionsFor($step),
            $letter->village_id,
        );
    }

    /**
     * Tahap kepala_desa mencakup pejabat Kepala Desa dan Sekdes, yang
     * dapat saling menggantikan. Dipisah agar aturan resolusi mudah ditemukan.
     *
     * @return array<int, string>
     */
    private function resolvablePositionsFor(FlowStep $step): array
    {
        if ($step->approver_position === 'kepala_desa') {
            return ['kepala_desa', 'sekdes'];
        }

        return $step->resolvablePositions();
    }

    public function resolveCitizenUser(
        Letter $letter
    ): ?User {

        return $this->userRepository->findByCitizenId($letter->citizen_id);
    }

    public function resolveVillageHead(): ?Official
    {
        return $this->officialRepository->findActiveVillageHead();
    }

    /**
     * @return Collection<int, Official>
     */
    public function resolveKasiKaurForLetter(Letter $letter): Collection
    {
        $assignedRole = $letter->letterType->assigned_role;

        return $this->officialRepository
            ->allActiveByPositionsAndVillage(['kasi_pelayanan', 'kaur_tu_umum'], $letter->village_id)
            ->filter(fn (Official $official) => $assignedRole === null || $official->position === $assignedRole)
            ->load('user')
            ->values();
    }

    public function getAllWithRelations(User $user): Collection
    {
        return $this->officialRepository->allWithRelations($this->villageId($user));
    }

    public function getForShow(int $id, User $user): Official
    {
        return $this->officialRepository->findWithRelationsOrFail($id, $this->villageId($user));
    }

    public function create(array $data, User $user): Official
    {
        $villageId = $this->villageId($user);
        if (isset($data['village_id']) && $data['village_id'] !== $villageId) {
            abort(422, 'Pejabat harus berasal dari desa Anda.');
        }
        $data['village_id'] = $villageId;
        $this->assertRelatedRecordsInVillage($data, $villageId);
        $position = OfficialPosition::tryFrom($data['position'] ?? '');

        if ($position?->hasAccount() && ! empty($data['user_id'])) {
            abort(422, 'Gunakan endpoint promote untuk menetapkan jabatan pada akun.');
        }

        $this->assertPositionAvailable($data);

        return $this->officialRepository->create($data);
    }

    public function update(Official $official, array $data, User $user): Official
    {
        $villageId = $this->villageId($user);
        if ($official->village_id !== $villageId || (isset($data['village_id']) && $data['village_id'] !== $villageId)) {
            abort(404, 'Data pejabat tidak ditemukan.');
        }
        $data['village_id'] = $villageId;
        $this->assertRelatedRecordsInVillage(array_merge($official->only(['citizen_id', 'rt_id', 'rw_id', 'hamlet_id']), $data), $villageId);
        if (
            $official->user_id !== null &&
            array_intersect(['position', 'user_id', 'citizen_id', 'is_active', 'ended_at'], array_keys($data)) !== []
        ) {
            abort(422, 'Gunakan endpoint promote/demote/rotate untuk mengubah jabatan akun.');
        }

        $merged = array_merge([
            'position' => $official->position,
            'village_id' => $official->village_id,
            'rt_id' => $official->rt_id,
            'rw_id' => $official->rw_id,
            'hamlet_id' => $official->hamlet_id,
            'is_active' => $official->is_active,
        ], $data);

        $this->assertPositionAvailable($merged, excludeId: $official->id);

        return $this->officialRepository->update($official, $data);
    }

    private function villageId(User $user): string
    {
        if ($user->role !== 'petugas_desa' || ! $user->is_active || ! $user->village_id) {
            abort(403, 'Petugas Desa aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }

    private function assertRelatedRecordsInVillage(array $data, string $villageId): void
    {
        if (isset($data['citizen_id']) && ! Citizen::query()->whereKey($data['citizen_id'])->where('village_id', $villageId)->exists()) {
            abort(422, 'Data warga pejabat harus berasal dari desa Anda.');
        }
        if (isset($data['user_id']) && ! User::query()->whereKey($data['user_id'])->where('village_id', $villageId)->exists()) {
            abort(422, 'Akun pejabat harus berasal dari desa Anda.');
        }
        foreach ([
            'rt_id' => Rt::class,
            'rw_id' => Rw::class,
            'hamlet_id' => Hamlet::class,
        ] as $field => $model) {
            if (isset($data[$field]) && ! $model::query()->whereKey($data[$field])->where('village_id', $villageId)->exists()) {
                abort(422, 'Wilayah jabatan harus berasal dari desa Anda.');
            }
        }
    }

    public function delete(Official $official): bool
    {
        if ($official->is_active && $official->user_id !== null) {
            abort(409, 'Jabatan aktif tidak dapat dihapus. Turunkan (demote) terlebih dahulu.');
        }

        return $this->officialRepository->delete($official);
    }

    /**
     * Mencegah dua pejabat aktif sekaligus menjabat posisi yang sama
     * pada lingkup wilayah yang sama (mis. dua RT aktif untuk rt_id
     * yang sama, atau dua Kepala Desa aktif dalam satu village).
     * Hanya diperiksa ketika data yang disimpan berstatus aktif.
     */
    public function assertPositionAvailable(array $data, ?int $excludeId = null): void
    {
        $position = OfficialPosition::tryFrom($data['position'] ?? '');

        if ($position === null || ! $position->isSingleHolderPerScope()) {
            return;
        }

        $isActive = $data['is_active'] ?? true;

        if (! $isActive) {
            return;
        }

        $exists = $this->officialRepository->existsActiveByPositionAndScope(
            position: $position->value,
            villageId: $data['village_id'] ?? null,
            rtId: $data['rt_id'] ?? null,
            rwId: $data['rw_id'] ?? null,
            hamletId: $data['hamlet_id'] ?? null,
            excludeId: $excludeId,
        );

        if ($exists) {
            abort(409, 'Sudah ada pejabat aktif lain untuk posisi dan wilayah yang sama.');
        }
    }
}
