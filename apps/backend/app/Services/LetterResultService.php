<?php

namespace App\Services;

use App\Enums\LetterResultStage;
use App\Enums\LetterStatus;
use App\Models\Letter;
use App\Models\LetterAttachment;
use App\Models\LetterResult;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Repositories\LetterRepository;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * Tahap setelah formulir pelayanan terbit: pemohon mengunggah hasil dari
 * instansi luar (mis. KK baru dari Disdukcapil) pada surat yang sama,
 * lalu Kasi/Kaur yang ditugaskan menerima atau menolaknya. Unggahan yang
 * ditolak dapat diganti dengan unggahan baru; Terapkan perubahan data
 * baru dapat dijalankan setelah hasilnya diterima.
 */
class LetterResultService
{
    public function __construct(
        protected LetterRepository $letterRepository,
        protected LetterAttachmentService $letterAttachmentService,
        protected OfficialService $officialService,
    ) {}

    /**
     * @param  array<int, UploadedFile>  $files
     */
    public function submit(Letter $letter, User $uploader, array $files): LetterResult
    {
        /** @var array<int, LetterAttachment> $stored */
        $stored = [];

        try {
            return DB::transaction(function () use ($letter, $uploader, $files, &$stored): LetterResult {
                // Lock agar dua unggahan bersamaan tidak sama-sama lolos.
                $locked = $this->letterRepository->findForUpdateOrFail($letter->id);

                if ($locked->resultStage() !== LetterResultStage::AwaitingUpload) {
                    abort(409, 'Hasil untuk surat ini sedang diverifikasi atau sudah diterima.');
                }

                $result = $locked->results()->create([
                    'status' => LetterResult::STATUS_SUBMITTED,
                    'submitted_by' => $uploader->id,
                ]);

                foreach ($files as $file) {
                    $stored[] = $this->letterAttachmentService->store(
                        $locked,
                        $file,
                        $uploader,
                        LetterAttachment::KIND_RESULT,
                        null,
                        $result->id,
                    );
                }

                $this->log($locked, $uploader, 'Hasil dari instansi diunggah pemohon');

                foreach ($this->officialService->resolveKasiKaurForLetter($locked) as $official) {
                    $official->user?->notify(new LetterStatusNotification(
                        $locked,
                        'Hasil dari instansi menunggu verifikasi',
                        'Pemohon mengunggah hasil dari instansi. Periksa berkasnya lalu terima atau tolak.',
                        'letter_result_submitted',
                    ));
                }

                return $result->load('attachments');
            });
        } catch (\Throwable $exception) {
            // Berkas yang terlanjur tersimpan dibuang bila transaksi batal.
            foreach ($stored as $attachment) {
                $this->letterAttachmentService->deleteFile($attachment);
            }

            throw $exception;
        }
    }

    public function review(Letter $letter, LetterResult $result, User $reviewer, bool $accepted, ?string $notes): LetterResult
    {
        return DB::transaction(function () use ($letter, $result, $reviewer, $accepted, $notes): LetterResult {
            $locked = $this->letterRepository->findForUpdateOrFail($letter->id);

            if ($result->letter_id !== $locked->id) {
                abort(404, 'Hasil unggahan tidak ditemukan.');
            }

            if (
                $locked->resultStage() !== LetterResultStage::UnderReview
                || $locked->latestResult?->id !== $result->id
            ) {
                abort(409, 'Hasil unggahan ini sudah diverifikasi.');
            }

            $result->update([
                'status' => $accepted ? LetterResult::STATUS_ACCEPTED : LetterResult::STATUS_REJECTED,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
                'review_notes' => $notes,
            ]);

            $this->log(
                $locked,
                $reviewer,
                $accepted ? 'Hasil dari instansi diterima' : 'Hasil dari instansi ditolak: '.$notes,
            );

            $this->officialService->resolveCitizenUser($locked)?->notify($accepted
                ? new LetterStatusNotification(
                    $locked,
                    'Hasil dari instansi diterima',
                    'Hasil yang Anda unggah telah diverifikasi desa.',
                    'letter_result_accepted',
                )
                : new LetterStatusNotification(
                    $locked,
                    'Hasil dari instansi ditolak',
                    "Hasil yang Anda unggah ditolak: {$notes} Silakan unggah ulang.",
                    'letter_result_rejected',
                ));

            return $result->load('attachments');
        });
    }

    private function log(Letter $letter, User $actor, string $reason): void
    {
        $this->letterRepository->createStatusLogForLetter($letter, [
            'actor_id' => $actor->id,
            'old_status' => LetterStatus::Approved->value,
            'new_status' => LetterStatus::Approved->value,
            'reason' => $reason,
        ]);
    }
}
