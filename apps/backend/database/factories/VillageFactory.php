<?php

namespace Database\Factories;

use App\Models\Village;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Village>
 */
class VillageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Desa '.fake()->unique()->city(),
            'code' => fake()->unique()->numerify('VLG-####'),
            'head_name' => fake()->name(),
            'address' => fake()->address(),
            'phone' => fake()->numerify('08##########'),
        ];
    }
}
