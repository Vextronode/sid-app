<?php

namespace Database\Seeders;

use App\Models\Village;
use App\Models\VillageOrgPosition;
use App\Repositories\VillageOrgPositionRepository;
use Illuminate\Database\Seeder;

/**
 * Slot Ketua/Wakil Ketua/Anggota untuk BPD, LPM, Karang Taruna, dan PKK
 * setiap desa. Slotnya kosong; petugas desa yang mengisi.
 */
class VillageOrgPositionSeeder extends Seeder
{
    public function run(VillageOrgPositionRepository $repository): void
    {
        foreach (Village::query()->pluck('id') as $villageId) {
            foreach (VillageOrgPosition::ORG_TYPES as $orgType) {
                $repository->ensureSlots($villageId, $orgType);
            }
        }
    }
}
