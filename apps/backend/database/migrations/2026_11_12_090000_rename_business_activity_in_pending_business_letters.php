<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

/**
 * Isian SKU (A01) `jenis_usaha` berganti nama menjadi `kegiatan_usaha`
 * (LetterTypeSeeder). Surat yang sudah punya snapshot tetap memakai template
 * lama yang dibekukan, jadi payload-nya tidak diubah. Surat tanpa snapshot
 * (masih diproses, atau snapshot-nya ditunda) akan dirender dengan template
 * baru, jadi key payload-nya ikut diganti agar kegiatan usaha tetap tercetak.
 */
return new class extends Migration
{
    private const FROM = 'jenis_usaha';

    private const TO = 'kegiatan_usaha';

    public function up(): void
    {
        $this->renameKey(self::FROM, self::TO);
    }

    public function down(): void
    {
        $this->renameKey(self::TO, self::FROM);
    }

    private function renameKey(string $from, string $to): void
    {
        DB::table('letters')
            ->join('letter_types', 'letter_types.id', '=', 'letters.letter_type_id')
            ->where('letter_types.code', 'A01')
            ->whereNull('letters.snapshot')
            ->whereNotNull('letters.payload')
            ->select('letters.id', 'letters.payload')
            ->orderBy('letters.id')
            ->chunk(200, function ($letters) use ($from, $to): void {
                foreach ($letters as $letter) {
                    // Format cast `encrypted:array` di model Letter.
                    $payload = json_decode(Crypt::decryptString($letter->payload), true);

                    if (! is_array($payload) || ! array_key_exists($from, $payload) || array_key_exists($to, $payload)) {
                        continue;
                    }

                    $payload[$to] = $payload[$from];
                    unset($payload[$from]);

                    DB::table('letters')
                        ->where('id', $letter->id)
                        ->update(['payload' => Crypt::encryptString(json_encode($payload))]);
                }
            });
    }
};
