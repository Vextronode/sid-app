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
            $key = [
                'village_id' => $villageId,
                'classification_code' => $classificationCode,
                'year' => $year,
            ];

            // Nomor pertama per klasifikasi per tahun: dua persetujuan final
            // bersamaan bisa sama-sama membuat baris counter. ON CONFLICT DO
            // NOTHING membuat yang kalah tidak kena unique violation (yang
            // membatalkan transaksi PostgreSQL-nya), lalu antre di lock bawah.
            LetterNumberCounter::query()->insertOrIgnore([
                ...$key,
                'last_number' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $counter = LetterNumberCounter::query()
                ->where($key)
                ->lockForUpdate()
                ->firstOrFail();

            $counter->increment('last_number');

            return $counter->fresh()->last_number;
        });
    }
}
