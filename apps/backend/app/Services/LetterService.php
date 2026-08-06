<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\LetterType;
use App\Models\LetterStatusLog;
use Illuminate\Support\Facades\DB;
use App\Services\OfficialService;
use Illuminate\Validation\ValidationException;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use App\Notifications\LetterStatusNotification;

class LetterService
{
    public function __construct(
        protected OfficialService $officialService
    ) {}
    public function createLetter(array $data): Letter
    {
        return DB::transaction(function () use ($data) {

            $user = auth()->user();

            $citizen = $user->citizen;


            $letterType = LetterType::findOrFail(
                $data['letter_type_id']
            );


            $letter = Letter::create([

                'village_id' => $user->village_id,

                'letter_type_id' => $letterType->id,

                'submitted_by' => $user->id,

                'citizen_id' => $citizen->id,


                'applicant_name' => $citizen->name,

                'applicant_nik' => $citizen->nik,

                'applicant_nik_hash' => $citizen->nik_hash,

                'applicant_address' => $citizen->address,


                'purpose' => $data['purpose'],

                'payload' => $data['payload'] ?? null,

                'notes' => $data['notes'] ?? null,


                'status' => 'pending',

                'submitted_at' => now(),

            ]);



            LetterStatusLog::create([

                'letter_id' => $letter->id,

                'actor_id' => $user->id,

                'old_status' => null,

                'new_status' => 'pending',

                'reason' => 'Permohonan surat dibuat',

            ]);

        $this->createFirstApproval($letter);
        

        $this->notifyRt($letter);

        return $letter;

        });
    }

    private function verifyLetterType(
        LetterType $letterType,
        array $data,
        $citizen
    ): void {

        switch ($letterType->verification_type) {

            case 'auto':

                if (!$citizen || !$citizen->is_active) {
                    throw ValidationException::withMessages([
                        'letter_type_id' => 'Data warga tidak valid.'
                    ]);
                }

                break;


            case 'manual':

                // menunggu verifikasi petugas
                // status tetap pending
                break;


            case 'document':

                if (
                    empty($data['attachments'])
                ) {
                    throw ValidationException::withMessages([
                        'attachments' => 'Dokumen wajib diupload.'
                    ]);
                }

                break;
        }
    }

    private function createFirstApproval(Letter $letter): void
    {
        $citizen = $letter->citizen;

        $official = $this->officialService
            ->resolveRtForCitizen($citizen);


        if (!$official) {
            throw ValidationException::withMessages([
                'approval' => 'Petugas RT belum tersedia.'
            ]);
        }


        $letter->approvals()->create([
            'approved_by' => $official->user_id,
            'approval_level' => 'rt',
            'deadline_at' => now()->addDays(3),
        ]);
    }

    private function notifyRt(Letter $letter): void
{
    $official = $this->officialService
        ->resolveRtForCitizen($letter->citizen);

    if ($official?->user) {

        $official->user->notify(
            new LetterStatusNotification(
                $letter,
                'Permohonan Surat Baru',
                'Ada permohonan surat baru yang menunggu verifikasi RT.',
                'pending'
            )
        );

    }
}

    public function getScopedLetters(
        User $user,
        array $filters = []
    ): Collection
    {
        $query = Letter::query()
            ->with([
                'citizen',
                'letterType',
                'approvals',
                'user',
            ]);

        switch ($user->role) {

            case 'warga':

                $query->where(
                    'submitted_by',
                    $user->id
                );

                break;

            case 'rt':

                $official = $user->official;

                $query->whereHas(
                    'citizen',
                    fn ($q) => $q->where(
                        'rt_id',
                        $official->rt_id
                    )
                );

                break;

            case 'rw':

                $official = $user->official;

                $query->whereHas(
                    'citizen.rt',
                    fn ($q) => $q->where(
                        'rw_id',
                        $official->rw_id
                    )
                );

                break;

            case 'kadus':

                break;

            case 'kasi_pelayanan':

            case 'kaur_tu_umum':


            case 'petugas_desa':

            case 'sekretaris_desa':

            case 'kepala_desa':

                // melihat semua surat
                break;

            default:

                abort(403);

        }

        // ===========================
        // FILTER
        // ===========================

        if (! empty($filters['status'])) {

            $query->where(
                'status',
                $filters['status']
            );

        }

        if (! empty($filters['letter_type_id'])) {

            $query->where(
                'letter_type_id',
                $filters['letter_type_id']
            );

        }

        if (! empty($filters['from'])) {

            $query->whereDate(
                'submitted_at',
                '>=',
                $filters['from']
            );

        }

        if (! empty($filters['to'])) {

            $query->whereDate(
                'submitted_at',
                '<=',
                $filters['to']
            );

        }

        if (! empty($filters['applicant_name'])) {

            $query->where(
                'applicant_name',
                'like',
                '%' . $filters['applicant_name'] . '%'
            );

        }

        $letters = $query
            ->latest()
            ->get();

        // ===========================
        // FLAG IS_OVERDUE
        // ===========================

        $letters->each(function ($letter) {

            $approval = $letter->approvals
                ->whereNull('approved_by')
                ->sortBy('deadline_at')
                ->first();

            $letter->is_overdue =
                $approval &&
                $approval->deadline_at &&
                now()->greaterThan($approval->deadline_at);

        });

        return $letters;
    }
}