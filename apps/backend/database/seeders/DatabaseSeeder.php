<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            DemoVillageSeeder::class,
            OfficialPositionTypeSeeder::class,
            NewsCategorySeeder::class,
            OccupationSeeder::class,
            DemoCitizenSeeder::class,
            DemoOfficialSeeder::class,
            DemoNewsSeeder::class,
            ApprovalFlowSeeder::class,
            ApprovalSettingSeeder::class,
            LetterTypeSeeder::class,
        ]);
    }
}
