<?php

namespace Database\Factories;

use App\Models\Family;
use App\Models\Rt;
use App\Models\Village;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Family>
 */
class FamilyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'village_id' => fn () => Village::query()->value('id') ?? Village::factory()->create()->id,
            'no_kk' => fake()->unique()->numerify('################'),
            'family_address' => fake()->address(),
            'family_status' => 'aktif',
            // rw_id dan hamlet_id diturunkan Family dari RT.
            'rt_id' => Rt::factory(),
        ];
    }
}
