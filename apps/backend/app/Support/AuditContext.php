<?php

namespace App\Support;

use App\Services\PopulationAuditService;
use Closure;

/**
 * Konteks berlingkup untuk jejak audit data kependudukan yang ditulis
 * observer (PopulationAuditObserver). Pemanggil tidak menulis log sendiri;
 * ia hanya memberi keterangan untuk semua penyimpanan di dalam callback:
 *
 *  - with(['source' => 'import'], fn () => ...): properti tambahan. Kunci
 *    `event` menggantikan nama event observer;
 *  - with([...], fn () => ..., aggregate: true): perubahan satu subjek di
 *    dalam callback digabung menjadi satu entri dan ditulis di akhir
 *    callback (Terapkan surat: satu `letter_fulfilled` per warga/KK).
 *    Pakai hanya bila callback berjalan di dalam satu transaksi database,
 *    agar entrinya ikut batal bila transaksi batal;
 *  - muted(fn () => ...): seeder. Observer tidak menulis apa pun, event
 *    model lain (mis. `saving` yang menghitung nik_hash) tetap berjalan.
 */
class AuditContext
{
    /** @var list<array{context: array<string, mixed>, muted: bool, aggregate: bool, entries: array<string, array<string, mixed>>}> */
    private array $frames = [];

    /**
     * @template T
     *
     * @param  array<string, mixed>  $context
     * @param  Closure(): T  $callback
     * @return T
     */
    public function with(array $context, Closure $callback, bool $aggregate = false): mixed
    {
        return $this->run(['context' => $context, 'muted' => false, 'aggregate' => $aggregate, 'entries' => []], $callback);
    }

    /**
     * @template T
     *
     * @param  Closure(): T  $callback
     * @return T
     */
    public function muted(Closure $callback): mixed
    {
        return $this->run(['context' => [], 'muted' => true, 'aggregate' => false, 'entries' => []], $callback);
    }

    public function isMuted(): bool
    {
        return in_array(true, array_column($this->frames, 'muted'), true);
    }

    /**
     * Gabungan konteks semua lingkup yang sedang aktif (yang terdalam menang).
     *
     * @return array<string, mixed>
     */
    public function context(): array
    {
        return array_merge([], ...array_column($this->frames, 'context'));
    }

    /**
     * Menahan entri di lingkup `aggregate` terdalam, digabung dengan entri
     * subjek yang sama: nilai lama dari perubahan pertama, nilai baru dari
     * yang terakhir. False bila tidak ada lingkup seperti itu.
     *
     * @param  array{key: string, changes: array<string, array{old: mixed, new: mixed}>}  $entry
     */
    public function hold(array $entry): bool
    {
        for ($index = count($this->frames) - 1; $index >= 0; $index--) {
            if (! $this->frames[$index]['aggregate']) {
                continue;
            }

            $held = $this->frames[$index]['entries'][$entry['key']] ?? null;

            if ($held !== null) {
                foreach ($entry['changes'] as $field => $change) {
                    $held['changes'][$field] = [
                        'old' => array_key_exists($field, $held['changes']) ? $held['changes'][$field]['old'] : $change['old'],
                        'new' => $change['new'],
                    ];
                }

                $entry = $held;
            }

            $this->frames[$index]['entries'][$entry['key']] = $entry;

            return true;
        }

        return false;
    }

    /**
     * @param  array{context: array<string, mixed>, muted: bool, aggregate: bool, entries: array<string, array<string, mixed>>}  $frame
     */
    private function run(array $frame, Closure $callback): mixed
    {
        $this->frames[] = $frame;
        $depth = count($this->frames) - 1;

        try {
            $result = $callback();
        } catch (\Throwable $exception) {
            // Entri yang ditahan dibuang bersama transaksi yang batal.
            array_splice($this->frames, $depth);

            throw $exception;
        }

        $entries = $this->frames[$depth]['entries'];
        array_splice($this->frames, $depth);

        // Ditulis setelah lingkupnya ditutup: bila masih ada lingkup
        // `aggregate` di luar, entri ini ikut digabung di sana.
        foreach ($entries as $entry) {
            app(PopulationAuditService::class)->write($entry);
        }

        return $result;
    }
}
