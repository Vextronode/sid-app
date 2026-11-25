<?php

namespace App\Exceptions;

use Illuminate\Support\Arr;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Hapus ditolak (409) karena data masih dipakai data lain
 * (App\Repositories\ReferenceRepository). Database juga menolaknya lewat
 * foreign key ON DELETE NO ACTION.
 */
class RecordInUseException extends ConflictHttpException
{
    /** @param  list<string>  $usedBy */
    public static function region(string $regionLabel, array $usedBy): self
    {
        return new self(
            "{$regionLabel} tidak bisa dihapus karena masih dipakai data ".self::list($usedBy)
            .'. Nonaktifkan saja bila wilayah ini sudah tidak dipakai.'
        );
    }

    /** @param  list<string>  $usedBy */
    public static function citizen(array $usedBy): self
    {
        return new self(
            'Data warga tidak bisa dihapus karena sudah punya '.self::list($usedBy)
            .'. Hapus hanya untuk data salah input; warga yang meninggal atau pindah dinonaktifkan lewat surat (Terapkan).'
        );
    }

    /** "a", "a dan b", "a, b, dan c" */
    private static function list(array $items): string
    {
        return count($items) === 2
            ? implode(' dan ', $items)
            : Arr::join($items, ', ', ', dan ');
    }
}
