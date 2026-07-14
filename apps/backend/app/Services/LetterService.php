<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\LetterType;

class LetterService
{
    public function createLetter(array $data): Letter
    {
        $user = auth()->user();

        $citizen = $user->citizen;

        $letterType = LetterType::findOrFail(
            $data['letter_type_id']
        );

        return Letter::create([
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

            'submitted_at' => now(),
            'status' => 'pending',
        ]);
    }
}