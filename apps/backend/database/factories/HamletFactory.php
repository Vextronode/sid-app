<?php

namespace Database\Factories;

use App\Models\Hamlet;
use App\Models\Village;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Hamlet>
 */
class HamletFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Dusun '.fake()->unique()->citySuffix(),
            'code' => fake()->unique()->numerify('DSN-####'),
            'is_active' => true,
            'village_id' => Village::factory(),
        ];
    }
}
