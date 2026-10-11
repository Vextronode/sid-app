<?php

namespace App\Support;

use App\Enums\OfficialPosition;
use App\Repositories\OfficialPositionTypeRepository;

/**
 * Nama tampilan sebuah nilai officials.position: label enum untuk jabatan
 * berakun, label jenis jabatan desa untuk sisanya. Label jenis jabatan
 * dimuat sekali per desa supaya daftar pejabat tidak memicu query per baris.
 */
class OfficialPositionCatalog
{
    /** @var array<string, array<string, string>> */
    private array $typeLabels = [];

    public function __construct(
        private readonly OfficialPositionTypeRepository $types,
    ) {}

    public function label(?string $position, ?string $villageId): ?string
    {
        if ($position === null) {
            return null;
        }

        return OfficialPosition::tryFrom($position)?->label()
            ?? $this->typeLabels($villageId)[$position]
            ?? $position;
    }

    public function forget(?string $villageId): void
    {
        unset($this->typeLabels[$villageId ?? '']);
    }

    /**
     * @return array<string, string>
     */
    private function typeLabels(?string $villageId): array
    {
        if ($villageId === null) {
            return [];
        }

        return $this->typeLabels[$villageId] ??= $this->types
            ->allForVillage($villageId)
            ->pluck('label', 'code')
            ->all();
    }
}
