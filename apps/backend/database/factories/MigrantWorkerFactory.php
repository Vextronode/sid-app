<?php

namespace Database\Factories;

use App\Models\Letter;
use App\Models\MigrantWorker;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MigrantWorker>
 */
class MigrantWorkerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'letter_id' => Letter::factory()->approved(),
            'village_id' => fn (array $attributes) => Letter::query()->whereKey($attributes['letter_id'])->value('village_id'),
            'citizen_id' => null,
            'height_cm' => 160,
            'weight_kg' => 55,
            'phone' => '0812'.fake()->numerify('########'),
            'email' => fake()->safeEmail(),
            'education_level' => 'slta',
            'school_name' => 'SMA Negeri 1',
            'major' => 'IPS',
            'graduation_year' => 2020,
            'certificates' => [],
            'work_history' => [],
            'guardian_relation' => 'ibu',
            'guardian_name' => fake()->name('female'),
            'guardian_address' => fake()->streetAddress(),
            'guardian_phone' => '0813'.fake()->numerify('########'),
            'guardian_email' => null,
            'destination_country' => 'Taiwan',
            'employer_name' => fake()->company(),
            'employer_address' => fake()->address(),
            'employer_contact' => '+886 2 1234 5678',
            'agency_name' => 'PT '.fake()->lastName().' Jaya',
            'agency_contact' => '021'.fake()->numerify('#######'),
            'position' => 'Caregiver',
            'salary_facilities' => 'NTD 20.000/bulan, makan dan asrama',
            'contract_start' => now()->addMonth()->toDateString(),
            'contract_end' => now()->addYears(3)->toDateString(),
        ];
    }
}
