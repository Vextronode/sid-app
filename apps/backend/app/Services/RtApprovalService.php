<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use App\Notifications\LetterStatusNotification;
use App\Models\Official;
class RtApprovalService
{
    public function __construct(
        protected OfficialService $officialService
    ) {}

    public function getPendingLetters(User $user)
    {
        $official = $user->official;


        if (!$official) {
            abort(403, 'Data official tidak ditemukan.');
        }


        return Letter::query()
            ->whereIn('status', [
                'pending',
                'rt_approved',
                'rw_approved',
                'rt_rejected'
            ])
            ->whereHas('citizen', function ($query) use ($official) {

                $query->where(
                    'rt_id',
                    $official->rt_id
                );

            })
            ->with([
                'citizen',
                'letterType',
                'approvals.approvedBy:id,name'
            ])
            ->latest()
            ->get();
    }

    public function decision(
        Letter $letter,
        User $user,
        array $data
    ): void {

        $official = $user->official;

        if (! $official) {
            abort(403, 'Data petugas tidak ditemukan.');
        }

        if ($letter->citizen->rt_id != $official->rt_id) {
            abort(403, 'Anda tidak berwenang memproses surat ini.');
        }

        DB::transaction(function () use (
            $letter,
            $user,
            $data,
            $official
        ) {

            $oldStatus = $letter->status->value;

            $newStatus = $data['status'] === 'approved'
                ? 'rt_approved'
                : 'rt_rejected';

            // Update letter
            $letter->update([
                'status' => $newStatus,
                'processed_at' => now(),
            ]);

            // Approval RT
            $letter->approvals()
                ->where('approval_level', 'rt')
                ->update([
                    'approved_by' => $user->id,
                ]);


            if ($data['status'] === 'approved') {

                // Approval RW
                $letter->approvals()->create([
                    'approved_by' => null,
                    'approval_level' => 'rw',
                    'deadline_at' => now()->addDays(2),
                ]);
                
         
                // Cari RW
$rwOfficial = Official::where('rw_id', $official->rw_id)
    ->where('position', 'rw')
    ->where('is_active', true)
    ->first();

                // Notifikasi RW
                if ($rwOfficial?->user) {


    $rwOfficial->user->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Surat Baru',
                            'Ada surat yang menunggu persetujuan RW.',
                            'rt_approved'
                        )
                    );
                }

                // Notifikasi Warga
                $citizenUser = $this->officialService
                    ->resolveCitizenUser($letter);

                if ($citizenUser) {

                    $citizenUser->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Permohonan Diproses',
                            'Permohonan surat Anda telah disetujui oleh RT dan sedang diproses oleh RW.',
                            'rt_approved'
                        )
                    );
                }

            } else {

                // Notifikasi Warga
                $citizenUser = $this->officialService
                    ->resolveCitizenUser($letter);

                if ($citizenUser) {

                    $citizenUser->notify(
                        new LetterStatusNotification(
                            $letter,
                            'Permohonan Ditolak',
                            'Permohonan surat Anda ditolak oleh RT.',
                            'rt_rejected'
                        )
                    );
                }
            }

            // Status Log
            $letter->statusLogs()->create([
                'actor_id' => $user->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'reason' => $data['notes'] ?? null,
            ]);
        });
    }
}