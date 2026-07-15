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


        $approval = LetterApproval::create([
            'letter_id' => $letter->id,
            'official_id' => $official->id,
            'status' => $status,
            'notes' => $notes,
            'approved_at' => now(),
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