<?php

namespace App\Observers;

use App\Events\LetterChanged;
use App\Models\Letter;

/**
 * Sinyal realtime setiap kali surat berubah, dari service mana pun
 * (pengajuan, keputusan RT/Kades, terbit, tanda tangan, hasil, hapus).
 *
 * Bukan hanya perubahan `status`: perpindahan giliran persetujuan
 * (`current_step_order`) mengubah antrean pejabat tanpa mengubah status.
 * Kolom pembukuan internal diabaikan supaya pengingat terjadwal dan
 * backfill snapshot tidak memicu sinyal.
 */
class LetterRealtimeObserver
{
    /** Kolom yang tidak memengaruhi daftar, ringkasan, maupun detail surat. */
    private const QUIET_COLUMNS = ['updated_at', 'expiry_notified_days', 'snapshot'];

    public function created(Letter $letter): void
    {
        $this->signal($letter);
    }

    public function updated(Letter $letter): void
    {
        if (array_diff(array_keys($letter->getChanges()), self::QUIET_COLUMNS) === []) {
            return;
        }

        $this->signal($letter);
    }

    public function deleted(Letter $letter): void
    {
        $this->signal($letter);
    }

    private function signal(Letter $letter): void
    {
        LetterChanged::dispatch(
            (string) $letter->getKey(),
            $letter->submitted_by !== null ? (string) $letter->submitted_by : null,
        );
    }
}
