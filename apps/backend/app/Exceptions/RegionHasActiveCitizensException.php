<?php

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class RegionHasActiveCitizensException extends ConflictHttpException
{
    public function __construct(string $regionLabel)
    {
        parent::__construct(
            strtolower($regionLabel) === 'dusun'
                ? 'Dusun tidak bisa dinonaktifkan karena masih ada warga aktif terdaftar di wilayah ini.'
                : "Wilayah {$regionLabel} tidak bisa dinonaktifkan karena masih ada warga aktif terdaftar."
        );
    }
}
