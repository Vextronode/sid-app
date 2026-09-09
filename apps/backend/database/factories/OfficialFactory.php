<?php

namespace Database\Factories;

use App\Models\Citizen;
use App\Models\Official;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Official>
 */
class OfficialFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'citizen_id' => Citizen::factory(),
            'user_id' => null,
            'position' => 'petugas_desa',
            'village_id' => null,
            'rt_id' => null,
            'rw_id' => null,
            'hamlet_id' => null,
            'started_at' => fake()->date(),
            'is_active' => true,
        ];
    }
}
