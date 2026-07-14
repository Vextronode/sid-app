<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\LetterType;
use App\Models\LetterStatusLog;
use Illuminate\Support\Facades\DB;
use App\Services\OfficialService;
use Illuminate\Validation\ValidationException;

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
}