<?php

namespace App\Services;

use App\Imports\CitizensImport;
use App\Models\Citizen;
use App\Models\User;
use App\Repositories\CitizenRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Facades\Excel;

class CitizenService
{
    public function __construct(
        protected CitizenRepository $citizenRepository
    ) {}

    public function getAllWithWilayah(): Collection
    {
        return $this->citizenRepository->allWithWilayah();
    }

    /**
     * UC-09 Tambah Warga. NIK dienkripsi + di-hash lewat cast/observer
     * di model Citizen; keunikan dicek lewat nik_hash. rw_id diturunkan
     * dari rt_id (request tidak mengirim rw_id).
     */
    public function create(array $data, User $user): Citizen
    {
        if (! $user->village_id) {
            abort(403, 'Data wilayah desa tidak ditemukan.');
        }

        $this->guardDuplicateNik($data['nik']);
        $this->guardSingleFamilyHead($data['family_id'] ?? null, $data['family_role'] ?? null);

        return DB::transaction(function () use ($data, $user) {
            $citizen = $this->citizenRepository->create(array_merge($data, [
                'village_id' => $user->village_id,
                'data_source' => 'manual_input_desa',
            ]));

            return $citizen->refresh()->load(['family', 'rt', 'rw', 'hamlet', 'village']);
        });
    }

    /**
     * UC-09 Edit Warga. NIK tidak bisa diubah (ditolak di
     * UpdateCitizenRequest). Perubahan rt_id menurunkan ulang rw_id.
     */
    public function update(Citizen $citizen, array $data, User $user): Citizen
    {
        if ($citizen->village_id !== $user->village_id) {
            abort(403, 'Anda tidak berwenang mengubah data warga ini.');
        }

        $familyId = array_key_exists('family_id', $data) ? $data['family_id'] : $citizen->family_id;
        $familyRole = array_key_exists('family_role', $data) ? $data['family_role'] : $citizen->family_role?->value;

        $this->guardSingleFamilyHead($familyId, $familyRole, $citizen->id);

        return DB::transaction(function () use ($citizen, $data) {
            $citizen = $this->citizenRepository->update($citizen, $data);

            return $citizen->load(['family', 'rt', 'rw', 'hamlet', 'village']);
        });
    }

    /**
     * EV5-11-S2 (UC-09 Import Excel). Setiap baris divalidasi &
     * disimpan sendiri-sendiri lewat create() - baris gagal di-skip,
     * bukan all-or-nothing transaction (SID-ARCH-BE-001 S5.4).
     *
     * @return array{total_rows: int, success_count: int, error_count: int, errors: list<array{row: int, message: string}>}
     */
    public function importFromExcel(UploadedFile $file, User $user): array
    {
        $import = new CitizensImport($this, $user);

        Excel::import($import, $file);

        return [
            'total_rows' => $import->successCount() + count($import->errorList()),
            'success_count' => $import->successCount(),
            'error_count' => count($import->errorList()),
            'errors' => $import->errorList(),
        ];
    }

    public function delete(Citizen $citizen): bool
    {
        return $this->citizenRepository->delete($citizen);
    }

    public function getDistinctWilayah(): Collection
    {
        return $this->citizenRepository->distinctWilayah();
    }

    private function guardDuplicateNik(string $nik): void
    {
        if ($this->citizenRepository->findByNikHash(hash('sha256', $nik))) {
            throw ValidationException::withMessages([
                'nik' => ['NIK sudah ada dalam database warga'],
            ]);
        }
    }

    /**
     * Hanya boleh ada 1 kepala_keluarga aktif per family_id.
     */
    private function guardSingleFamilyHead(?int $familyId, ?string $familyRole, ?int $excludeCitizenId = null): void
    {
        if (! $familyId || $familyRole !== 'kepala_keluarga') {
            return;
        }

        if ($this->citizenRepository->existsFamilyHead($familyId, $excludeCitizenId)) {
            throw ValidationException::withMessages([
                'family_role' => ['KK ini sudah memiliki kepala keluarga aktif.'],
            ]);
        }
    }
}
