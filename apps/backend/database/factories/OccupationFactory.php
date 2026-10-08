<?php

namespace Database\Factories;

use App\Models\Occupation;
use App\Models\Village;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Occupation>
 */
class OccupationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'village_id' => Village::factory(),
            'name' => fake()->unique()->jobTitle(),
            'is_active' => true,
            'sort_order' => 0,
        ];
    }
}
