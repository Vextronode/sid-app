<?php

namespace App\Services;

use App\Models\Letter;
use App\Repositories\LetterNumberCounterRepository;

class LetterNumberGenerator
{
    public function __construct(
        protected LetterNumberCounterRepository $counterRepository,
    ) {}

    public function next(Letter $letter): string
    {
        $letter->loadMissing('letterType');
        $year = now()->year;
        $number = $this->counterRepository->nextNumber(
            $letter->village_id,
            $letter->letter_type_id,
            $year,
        );

        return sprintf('%03d/%s/%d', $number, strtoupper($letter->letterType->code), $year);
    }
}
