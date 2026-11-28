<?php

namespace App\Services;

use App\Enums\LetterResultStage;
use App\Enums\LetterTypeCategory;
use App\Enums\UserRole;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Repositories\LetterRepository;
use App\Repositories\LetterTypeRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LetterTypeService
{
    public function __construct(
        protected LetterTypeRepository $letterTypeRepository,
        protected LetterRepository $letterRepository,
        protected OfficialService $officialService,
    ) {}

    /**
     * Default: hanya jenis aktif ber-template (dipakai warga saat submit).
     * $includeInactive (khusus Staf SIDUTama, dijaga IndexLetterTypeRequest):
     * semua jenis desa termasuk Draft dan Nonaktif.
     */
    public function list(User $user, bool $includeInactive = false): Collection
    {
        $villageId = $this->villageId($user);

        return $includeInactive
            ? $this->letterTypeRepository->allForVillage($villageId)
            : $this->letterTypeRepository->allSubmittable($villageId);
    }

    public function update(LetterType $letterType, array $data, User $user): LetterType
    {
        $letterType = $this->letterTypeRepository->findOrFail($letterType->id, $this->villageId($user));

        if (($data['is_active'] ?? false) === true && ! $letterType->isReady()) {
            throw ValidationException::withMessages([
                'is_active' => 'Jenis surat draft belum memiliki template sehingga tidak dapat diaktifkan.',
            ]);
        }

        // Kategori menentukan petugas: Persuratan Desa -> Kaur TU & Umum,
        // Layanan Kependudukan -> Kasi Pemerintahan.
        if (isset($data['category'])) {
            $data['assigned_role'] = LetterTypeCategory::from($data['category'])->handlerRole()->value;
        }

        $previousHandler = $letterType->assigned_role;

        return DB::transaction(function () use ($letterType, $data, $previousHandler): LetterType {
            $updated = $this->letterTypeRepository->update($letterType, $data);

            if ($updated->assigned_role !== $previousHandler) {
                $this->notifyNewHandlerOfOpenLetters($updated);
            }

            return $updated;
        });
    }

    /**
     * Surat yang sudah disetujui ikut berpindah ke petugas baru, tetapi
     * notifikasi tugasnya dulu terkirim ke petugas lama. Petugas baru diberi
     * tahu per surat yang tugasnya belum selesai (verifikasi hasil dari
     * instansi atau Terapkan); bila jabatannya kosong, notifyLetterHandlers
     * memberi tahu Staf SIDUTama.
     */
    private function notifyNewHandlerOfOpenLetters(LetterType $letterType): void
    {
        $handler = UserRole::tryFrom((string) $letterType->assigned_role)?->label() ?? 'petugas baru';
        $moved = "Penanganan {$letterType->name} dipindahkan ke {$handler}.";

        foreach ($this->letterRepository->awaitingHandlerForLetterType($letterType) as $letter) {
            $this->officialService->notifyLetterHandlers(
                $letter,
                $letter->resultStage() === LetterResultStage::UnderReview
                    ? new LetterStatusNotification(
                        $letter,
                        'Hasil dari instansi menunggu verifikasi',
                        "{$moved} Pemohon sudah mengunggah hasil dari instansi. Periksa berkasnya lalu terima atau tolak.",
                        'letter_result_submitted',
                    )
                    : new LetterStatusNotification(
                        $letter,
                        'Perubahan data menunggu diterapkan',
                        "{$moved} Surat ini sudah disetujui. Tinjau dan terapkan perubahan data kependudukan yang diajukan.",
                        'letter_needs_fulfillment',
                    ),
            );
        }
    }

    /**
     * Formulir isi tangan hanya untuk pemohon (akun warga aktif yang dapat
     * mengajukan surat) di desa jenis surat itu, dan hanya untuk jenis
     * surat yang sedang dapat diajukan. Identitas pemohon ikut tercetak.
     */
    public function handwrittenFormType(LetterType $letterType, User $user): LetterType
    {
        if ($user->cannot('create', Letter::class)) {
            abort(403, 'Formulir hanya dapat diunduh oleh warga yang akan mengajukan surat.');
        }

        $letterType = $this->letterTypeRepository->findOrFail($letterType->id, $this->villageId($user));

        if (! $letterType->is_active || ! $letterType->isReady()) {
            abort(404, 'Jenis surat ini sedang tidak dapat diajukan.');
        }

        return $letterType;
    }

    private function villageId(User $user): string
    {
        if (! $user->is_active || ! $user->village_id) {
            abort(403, 'Akun aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
