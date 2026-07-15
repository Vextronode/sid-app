<?php

namespace App\Services;

use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use App\Models\LetterApproval;
use App\Models\LetterStatusLog;
use App\Models\Letter;
use Symfony\Component\HttpKernel\Exception\HttpException;
use App\Enums\LetterStatus;
use App\Models\User;

class RwApprovalService
{

    private function validateGate(
        Letter $letter,
        User $user
    ): void {

        if ($letter->status !== LetterStatus::RtApproved) {
            abort(403, 'Surat belum dapat diproses oleh RW.');
        }

        $official = $user->official;

        if (! $official) {
            abort(403, 'Data petugas tidak ditemukan.');
        }

        if ($letter->citizen->rt->rw_id != $official->rw_id) {
            abort(403, 'Anda tidak berwenang memproses surat ini.');
        }
    }

    public function approve(
        Letter $letter,
        User $user,
        array $data
    )
    {
        $this->validateGate(
            $letter,
            $user
        );

        DB::transaction(function () use (
            $letter,
            $user,
            $data
        ){

            $oldStatus = $letter->status->value;

            $newStatus = $data['status'] === 'approved'
                ? 'rw_approved'
                : 'rw_rejected';


            $letter->approvals()
                ->where('approval_level','rw')
                ->update([
                    'approved_by' => $user->id,
                ]);


            $letter->approvals()->create([
                'approved_by' => null,
                'approval_level'=>'kadus',
                'deadline_at'=>now()->addDays(2),
            ]);


            $letter->statusLogs()->create([
                'actor_id'=>$user->id,
                'old_status'=>$oldStatus,
                'new_status'=>$newStatus,
                'reason'=>$data['notes'] ?? null,
            ]);


            $letter->update([
                'status'=>$newStatus,
                'notes'=>$data['notes'] ?? null,
                'processed_at'=>now(),
            ]);

        });

    }

    public function getPendingLetters(User $user)
    {
        $official = $user->official()
            ->where('position','rw')
            ->where('is_active',true)
            ->firstOrFail();


        return Letter::query()
            ->where('status', LetterStatus::RtApproved)
            ->whereHas('citizen.rt', function ($q) use ($official) {
                $q->where('rw_id',$official->rw_id);
            })
            ->with([
                'citizen',
                'letterType',
            ])
            ->latest()
            ->get();
    }
}