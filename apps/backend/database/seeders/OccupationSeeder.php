<?php

namespace Database\Seeders;

use App\Models\Village;
use App\Services\OccupationService;
use Illuminate\Database\Seeder;

class OccupationSeeder extends Seeder
{
    public function run(OccupationService $service): void
    {
        Village::query()->each(
            fn (Village $village) => $service->seedDefaultsForVillage($village)
        );
    }
}
