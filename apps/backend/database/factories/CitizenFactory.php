<?php

namespace Database\Factories;

use App\Enums\DomicileStatus;
use App\Enums\LastEducation;
use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\Village;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Citizen>
 */
class CitizenFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'village_id' => Village::factory(),
            'nik' => fake()->unique()->numerify('################'),
            'name' => fake()->name(),
            'date_of_birth' => fake()->date(),
            'place_of_birth' => fake()->city(),
            'gender' => fake()->randomElement(['L', 'P']),
            'address' => fake()->address(),
            'rt_id' => Rt::factory(),
            'rw_id' => Rw::factory(),
            'hamlet_id' => Hamlet::factory(),
            'marital_status' => fake()->randomElement(['belum_kawin', 'kawin', 'cerai_hidup', 'cerai_mati']),
            'occupation' => fake()->jobTitle(),
            'religion' => fake()->randomElement(['islam', 'kristen', 'katolik', 'hindu', 'buddha', 'konghucu']),
            'last_education' => fake()->randomElement(LastEducation::cases()),
            'domicile_status' => fake()->randomElement(DomicileStatus::cases()),
            'current_domicile' => null,
            'is_active' => true,
        ];
    }
}
