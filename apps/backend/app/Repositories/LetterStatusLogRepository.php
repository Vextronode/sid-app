<?php

namespace App\Repositories;

use App\Models\LetterStatusLog;

class LetterStatusLogRepository
{
    public function __construct()
    {
        //
    }

    public function create(array $data): LetterStatusLog
    {
        return LetterStatusLog::create($data);
    }
}
