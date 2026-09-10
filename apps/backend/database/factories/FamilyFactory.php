<?php

namespace Database\Factories;

use App\Models\Family;
use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
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
            'village_id' => Village::factory(),
            'no_kk' => fake()->unique()->numerify('################'),
            'family_address' => fake()->address(),
            'family_status' => 'aktif',
            'rt_id' => Rt::factory(),
            'rw_id' => Rw::factory(),
            'hamlet_id' => Hamlet::factory(),
            'head_of_family_id' => null,
        ];
    }
}
