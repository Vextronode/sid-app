<?php

namespace App\Rules;

use App\Enums\OfficialPosition;
use App\Repositories\OfficialPositionTypeRepository;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Jabatan sah bila termasuk jabatan berakun (enum OfficialPosition) atau
 * jenis jabatan aktif milik desa yang diberikan.
 */
class ValidOfficialPosition implements ValidationRule
{
    public function __construct(
        private readonly ?string $villageId,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || $value === '') {
            $fail('Posisi jabatan tidak dikenal.');

            return;
        }

        if (OfficialPosition::tryFrom($value) !== null) {
            return;
        }

        if (app(OfficialPositionTypeRepository::class)->findByCode($this->villageId, $value, activeOnly: true) === null) {
            $fail('Posisi jabatan tidak dikenal.');
        }
    }
}
