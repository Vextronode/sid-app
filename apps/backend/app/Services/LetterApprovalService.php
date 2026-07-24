<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\LetterApproval;
use App\Models\Official;
use Illuminate\Validation\ValidationException;

class LetterApprovalService
{

    public function approve(
        Letter $letter,
        Official $official,
        string $status,
        ?string $notes = null
    ) {

        $this->validateApproval(
            $letter,
            $official
        );


        $letter->approvals()
            ->where('approval_level', 'rw')
            ->whereNull('approved_by')
            ->latest()
            ->first()
            ?->update([
                'approved_by' => $user->id,
            ]);


        $letter->update([
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
                'letter' => 'Surat sudah diproses.'
            ]);

        }


        if (!$official->is_active) {

            throw ValidationException::withMessages([
                'official' => 'Petugas tidak aktif.'
            ]);

        }

    }

}