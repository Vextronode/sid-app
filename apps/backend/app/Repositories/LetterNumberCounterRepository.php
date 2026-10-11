<?php

namespace App\Repositories;

use App\Models\LetterNumberCounter;
use Illuminate\Support\Facades\DB;
use LogicException;

class LetterNumberCounterRepository
{
    public function nextNumber(string $villageId, string $classificationCode, int $year): int
    {
        if (DB::transactionLevel() === 0) {
            throw new LogicException('Nomor surat hanya boleh dibuat di dalam transaksi database.');
        }

        return DB::transaction(function () use ($villageId, $classificationCode, $year) {
            $counter = LetterNumberCounter::query()
                ->firstOrCreate([
                    'village_id' => $villageId,
                    'classification_code' => $classificationCode,
                    'year' => $year,
                ], [
                    'last_number' => 0,
                ]);

            $counter = LetterNumberCounter::query()
                ->whereKey($counter->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $counter->increment('last_number');

            return $counter->fresh()->last_number;
        });
    }
}
