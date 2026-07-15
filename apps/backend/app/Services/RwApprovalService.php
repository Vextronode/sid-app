<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use App\Models\LetterApproval;
use App\Models\LetterStatusLog;
use App\Models\Letter;
use Symfony\Component\HttpKernel\Exception\HttpException;
use App\Enums\LetterStatus;

class RwApprovalService
{

    public function validateGate(Letter $letter): void
    {
        if ($letter->status !== LetterStatus::RtApproved) {
            throw new HttpException(
                403,
                'Surat belum dapat diproses oleh RW.'
            );
        }
    }

    public function approve(Letter $letter, array $data)
    {
        $this->validateGate($letter);

        DB::transaction(function () use ($letter, $data) {

            $oldStatus = $letter->status;

            $newStatus = $data['decision'] === 'approved'
                ? 'rw_approved'
                : 'rw_rejected';

            $letter->update([
                'status' => $newStatus,
            ]);

            LetterApproval::where('letter_id', $letter->id)
            ->where('approval_level', 'rw')
            ->update([
                'approved_by' => auth()->id(),
            ]);

            LetterApproval::create([
                'letter_id'      => $letter->id,
                'approval_level' => 'kadus',
                'approved_by'    => null,
            ]);

            LetterStatusLog::create([
                'letter_id'  => $letter->id,
                'actor_id'   => auth()->id(),
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'reason'     => $data['notes'] ?? null,
            ]);
        });

        return response()->json([
            'message' => 'Approval RW berhasil diproses.'
        ]);
    }
}