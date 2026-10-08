<?php

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class OccupationInUseException extends ConflictHttpException
{
    public function __construct(int $citizenCount)
    {
        parent::__construct(
            "Pekerjaan masih dipakai {$citizenCount} warga. Nonaktifkan saja bila tidak ingin ditampilkan lagi."
        );
    }
}
