<?php

namespace App\Services;

use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use Illuminate\Database\Eloquent\Collection;

class OfficialService
{
    public function __construct(
        protected OfficialRepository $officialRepository,
        protected UserRepository $userRepository,
    ) {}

    public function resolveRtForCitizen(Citizen $citizen)
    {
        return $this->officialRepository->findActiveRtByRtId($citizen->rt_id);
    }

    public function getCurrentOfficial(User $user): Official
    {
        return $user->official()
            ->where('is_active', true)
            ->firstOrFail();
    }

    public function getCurrentRw(User $user): Official
    {
        return $user->official()
            ->where('position', 'rw')
            ->where('is_active', true)
            ->firstOrFail();
    }

    public function getCurrentRt(User $user): Official
    {
        return $user->official()
            ->where('position', 'rt')
            ->where('is_active', true)
            ->firstOrFail();
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
        $step = $letter->currentFlowStep();

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
            $rtId = $letter->citizen?->rt_id;

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
     * EV5-4-S5. Posisi Official mana saja yang relevan untuk satu
     * FlowStep, TERMASUK perluasan bisnis "Kepala Desa dan Sekdes
     * saling menggantikan" — bukan sekadar FlowStep::resolvablePositions()
     * apa adanya. Dipisah jadi method sendiri (bukan inline di
     * resolveOfficialsForStep) supaya titik perluasan ini gampang
     * ditemukan bila suatu saat ada posisi lain yang perlu perlakuan
     * serupa.
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

    public function getAllWithRelations(): Collection
    {
        return $this->officialRepository->allWithRelations();
    }

    public function getForShow(int $id): Official
    {
        return $this->officialRepository->findWithRelationsOrFail($id);
    }

    public function create(array $data): Official
    {
        $this->guardSinglePositionPerScope($data);

        return $this->officialRepository->create($data);
    }

    public function update(Official $official, array $data): Official
    {
        $merged = array_merge([
            'position' => $official->position,
            'village_id' => $official->village_id,
            'rt_id' => $official->rt_id,
            'rw_id' => $official->rw_id,
            'hamlet_id' => $official->hamlet_id,
            'is_active' => $official->is_active,
        ], $data);

        $this->guardSinglePositionPerScope($merged, excludeId: $official->id);

        return $this->officialRepository->update($official, $data);
    }

    public function delete(Official $official): bool
    {
        return $this->officialRepository->delete($official);
    }

    /**
     * Mencegah dua pejabat aktif sekaligus menjabat posisi yang sama
     * pada lingkup wilayah yang sama (mis. dua RT aktif untuk rt_id
     * yang sama, atau dua Kepala Desa aktif dalam satu village).
     * Hanya diperiksa ketika data yang disimpan berstatus aktif.
     */
    private function guardSinglePositionPerScope(array $data, ?int $excludeId = null): void
    {
        $isActive = $data['is_active'] ?? true;

        if (! $isActive) {
            return;
        }

        $exists = $this->officialRepository->existsActiveByPositionAndScope(
            position: $data['position'],
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
