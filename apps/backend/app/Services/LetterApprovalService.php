<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\LetterApproval;
use App\Models\Official;
use App\Repositories\LetterApprovalRepository;
use App\Repositories\LetterRepository;
use Illuminate\Validation\ValidationException;

class LetterApprovalService
{
    public function __construct(
        protected LetterApprovalRepository $letterApprovalRepository,
        protected LetterRepository $letterRepository,
    ) {}

    public function approve(
        Letter $letter,
        Official $official,
        string $status,
        ?string $notes = null
    ): ?LetterApproval {

        $this->validateApproval(
            $letter,
            $official
        );

        $approval = $this->letterApprovalRepository->findLatestPendingByLevel($letter, 'rw');

        if ($approval) {
            $this->letterApprovalRepository->updateApprovedBy($approval, $official->user_id);
        }

        $this->letterRepository->update($letter, [
            'status' => $status,
            'processed_at' => now(),
        ]);

        return $approval;
    }

    private function validateApproval(
        Letter $letter,
        Official $official
    ): void {

        if ($letter->status !== 'pending') {

            throw ValidationException::withMessages([
                'letter' => 'Surat sudah diproses.',
            ]);

        }

        if (! $official->is_active) {

            throw ValidationException::withMessages([
                'official' => 'Petugas tidak aktif.',
            ]);

        }

    }
}
