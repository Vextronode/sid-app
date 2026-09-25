<?php

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class RegionContainsCitizensException extends ConflictHttpException
{
    public function __construct(string $regionLabel)
    {
        parent::__construct(
            "Wilayah {$regionLabel} tidak bisa dihapus karena masih memiliki warga."
        );
    }
}
